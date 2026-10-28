'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { negocioDoPainel } from '@/lib/painel/negocio-atual'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { clienteMercadoPago, ErroMercadoPago, mercadoPagoConfigurado } from '@/lib/pagamentos/mercadopago'
import { PREFIXO_COMPRA } from '@/lib/pagamentos/compras'
import { registrarErro } from '@/lib/observabilidade/registrar-erro'
import { urlDoSite } from '@/lib/site'
import { enviarImagem } from '@/lib/storage/imagens'
import { notificar } from '@/lib/notificacoes/notificar'
import { lerOpcoesServico, type OpcaoServico } from '@/lib/divulgacao/servicos'
import { urlSegura } from '@/lib/utils'
import { enviarComunicado } from '@/lib/actions/admin-gestao-actions'

/** Volta do checkout pro mesmo endereço em que a compra começou (preview ou produção). */
function urlBase() {
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return urlDoSite()
}

async function auditar(atorId: string | null, acao: string, id: string, dados: Record<string, unknown>) {
  await createServiceClient().from('registros_auditoria').insert({ ator_id: atorId, acao, entidade: 'compra_servico', entidade_id: id, dados })
}

// ---------------------------------------------------------------------
// Lojista: comprar
// ---------------------------------------------------------------------
export async function comprarDivulgacao(formData: FormData) {
  if (!mercadoPagoConfigurado()) return { erro: 'Pagamento indisponível no momento. Fale com a gente pelo WhatsApp.' }
  const { user, negocio, papel } = await negocioDoPainel()
  if (!user || !negocio) return { erro: 'Entre na conta do seu negócio pra comprar.' }
  if (papel === 'atendente') return { erro: 'Só a pessoa dona ou gerente do negócio pode comprar divulgação.' }
  if (negocio.status_cadastro !== 'aprovado') return { erro: 'Seu cadastro ainda está em análise.' }
  if (!(await dentroDoLimite(`comprar:${user.id}`, 10, 3600))) return { erro: 'Muitas tentativas seguidas. Aguarde alguns minutos.' }

  const servicoId = String(formData.get('servico_id') ?? '')
  const dias = Number(formData.get('dias'))
  const db = createServiceClient()
  const { data: servico } = await db.from('servicos_pagos').select('id, nome, opcoes, ativo, posicao').eq('id', servicoId).maybeSingle()
  if (!servico?.ativo) return { erro: 'Esse serviço não está à venda agora.' }
  // preço sempre do catálogo no servidor, nunca do formulário
  const opcao = lerOpcoesServico(servico.opcoes).find((o) => o.dias === dias)
  if (!opcao) return { erro: 'Escolha um período válido.' }

  const { data: compra, error } = await db
    .from('compras_servicos')
    .insert({
      servico_id: servico.id,
      negocio_id: negocio.id,
      perfil_id: user.id,
      nome_servico: servico.nome,
      dias: opcao.dias,
      valor_centavos: opcao.preco_centavos,
      categoria_id: servico.posicao === 'banner_categoria' ? negocio.categoria_id ?? null : null,
    })
    .select('id')
    .single()
  if (error || !compra) {
    await registrarErro({ mensagem: `Falha ao criar compra: ${error?.message}`, contexto: 'comprarDivulgacao', usuarioId: user.id })
    return { erro: 'Não foi possível iniciar a compra agora. Tente de novo em instantes.' }
  }

  try {
    const periodo = opcao.dias ? ` (${opcao.dias} dias)` : ''
    const pref = await clienteMercadoPago.criarPreferencia({
      titulo: `Tanguá App: ${servico.nome}${periodo}`.slice(0, 120),
      valor: opcao.preco_centavos / 100,
      referenciaExterna: `${PREFIXO_COMPRA}${compra.id}`,
      emailPagador: user.email ?? '',
      urlRetorno: `${urlBase()}/painel/negocio/divulgacao?compra=${compra.id}`,
      urlNotificacao: `${urlDoSite()}/api/webhooks/mercadopago`,
    })
    await db.from('compras_servicos').update({ provedor_preferencia_id: pref.id }).eq('id', compra.id)
    await auditar(user.id, 'compra.iniciar', compra.id, { servico: servico.id, dias: opcao.dias, valor_centavos: opcao.preco_centavos })
    return { erro: null, urlPagamento: pref.init_point }
  } catch (err) {
    await db.from('compras_servicos').update({ status: 'cancelada' }).eq('id', compra.id)
    await registrarErro({ mensagem: `Mercado Pago recusou a preferência: ${(err as Error).message}`, contexto: 'comprarDivulgacao', usuarioId: user.id })
    return {
      erro:
        err instanceof ErroMercadoPago && err.status >= 400 && err.status < 500
          ? 'O Mercado Pago não aceitou os dados da compra. Confira o e-mail da sua conta e tente de novo.'
          : 'O serviço de pagamento não respondeu. Nenhuma cobrança foi feita; tente de novo em instantes.',
    }
  }
}

// ---------------------------------------------------------------------
// Admin: catálogo
// ---------------------------------------------------------------------
const schemaServico = z.object({
  id: z.string().regex(/^[a-z0-9_]{2,40}$/, 'Identificador: letras minúsculas, números e _.'),
  nome: z.string().trim().min(3).max(80),
  descricao: z.string().trim().max(400),
  posicao: z.enum(['banner_home', 'banner_categoria', 'banner_ofertas', 'destaque_busca', 'push', 'instagram', 'evento', 'vaga', 'outro']),
  requer_arte: z.boolean(),
  ordem: z.number().int().min(0).max(100),
})

/** "7 = 49,90" por linha → opções. Dias 0 = entrega única. */
function interpretarOpcoes(texto: string): OpcaoServico[] | { erro: string } {
  const opcoes: OpcaoServico[] = []
  for (const linha of texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const m = linha.match(/^(\d{1,3})\s*(?:dias?)?\s*[=:]\s*R?\$?\s*([\d.,]+)$/i)
    if (!m) return { erro: `Linha "${linha}" fora do formato. Use: 7 = 49,90` }
    const centavos = Math.round(Number(m[2].replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')) * 100)
    if (!Number.isFinite(centavos) || centavos < 100) return { erro: `Preço inválido em "${linha}" (mínimo R$ 1,00).` }
    opcoes.push({ dias: Number(m[1]), preco_centavos: centavos })
  }
  if (opcoes.length === 0) return { erro: 'Informe ao menos um período e preço.' }
  return opcoes.sort((a, b) => a.dias - b.dias)
}

export async function salvarServicoPago(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const v = schemaServico.safeParse({
    id: String(formData.get('id') ?? ''),
    nome: String(formData.get('nome') ?? ''),
    descricao: String(formData.get('descricao') ?? ''),
    posicao: String(formData.get('posicao') ?? 'outro'),
    requer_arte: formData.get('requer_arte') === 'on',
    ordem: Number(formData.get('ordem') ?? 0),
  })
  if (!v.success) return { erro: v.error.issues[0].message }
  const opcoes = interpretarOpcoes(String(formData.get('opcoes') ?? ''))
  if ('erro' in opcoes) return { erro: opcoes.erro }
  const db = createServiceClient()
  const { data: anterior } = await db.from('servicos_pagos').select('*').eq('id', v.data.id).maybeSingle()
  const { error } = await db
    .from('servicos_pagos')
    .upsert({ ...v.data, opcoes, ativo: anterior?.ativo ?? false, atualizado_em: new Date().toISOString() }, { onConflict: 'id' })
  if (error) return { erro: 'Não foi possível salvar.' }
  await db.from('registros_auditoria').insert({ ator_id: auth.user.id, acao: 'servico_pago.salvar', entidade: 'servico_pago', entidade_id: v.data.id, dados: { de: anterior, para: { ...v.data, opcoes } } })
  revalidatePath('/painel/admin/divulgacao')
  revalidatePath('/painel/negocio/divulgacao')
  return { erro: null }
}

export async function alternarServicoPago(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const id = String(formData.get('id') ?? '')
  const db = createServiceClient()
  const { data } = await db.from('servicos_pagos').select('ativo, opcoes').eq('id', id).maybeSingle()
  if (!data) return { erro: 'Serviço não encontrado.' }
  if (!data.ativo && lerOpcoesServico(data.opcoes).length === 0) return { erro: 'Defina período e preço antes de ligar.' }
  await db.from('servicos_pagos').update({ ativo: !data.ativo, atualizado_em: new Date().toISOString() }).eq('id', id)
  await db.from('registros_auditoria').insert({ ator_id: auth.user.id, acao: 'servico_pago.alternar', entidade: 'servico_pago', entidade_id: id, dados: { ativo: !data.ativo } })
  revalidatePath('/painel/admin/divulgacao')
  revalidatePath('/painel/negocio/divulgacao')
  return { erro: null }
}

// ---------------------------------------------------------------------
// Admin: produção da compra (arte, link, datas)
// ---------------------------------------------------------------------
export async function atualizarCompra(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const id = String(formData.get('id') ?? '')
  const acao = String(formData.get('acao') ?? 'salvar')
  const db = createServiceClient()
  const { data: compra } = await db.from('compras_servicos').select('*, servico:servicos_pagos(posicao)').eq('id', id).maybeSingle()
  if (!compra) return { erro: 'Compra não encontrada.' }

  const patch: Record<string, unknown> = { atualizado_em: new Date().toISOString() }
  const link = String(formData.get('link_destino') ?? '').trim()
  if (link) {
    const interno = link.startsWith('/') && !link.startsWith('//')
    if (!interno && !urlSegura(link)) return { erro: 'Link de destino inválido. Use um caminho do app (/negocio/...) ou https://' }
    patch.link_destino = link
  }
  const nota = String(formData.get('nota_interna') ?? '').trim()
  if (nota) patch.nota_interna = nota.slice(0, 1000)
  const arquivo = formData.get('arte') as File | null
  if (arquivo && arquivo.size > 0) {
    // admin já conferido acima; a pasta divulgacao/ não pertence a nenhum negócio, então sobe pelo servidor
    const r = await enviarImagem(db as unknown as ReturnType<typeof createClient>, arquivo, `divulgacao/${id}`)
    if (r.erro) return { erro: r.erro }
    patch.arte_url = r.url
  }

  const posicao = (compra.servico as { posicao?: string } | null)?.posicao ?? ''
  const pushTitulo = String(formData.get('push_titulo') ?? '').trim()
  const pushTexto = String(formData.get('push_texto') ?? '').trim()
  if (acao === 'no_ar' && posicao === 'push' && (pushTitulo.length < 3 || pushTitulo.length > 120 || pushTexto.length > 400)) {
    return { erro: 'Escreva o título (3 a 120 letras) e o texto (até 400) da notificação antes de enviar.' }
  }
  if (acao === 'no_ar') {
    if (!['pago', 'no_ar'].includes(compra.status)) return { erro: 'Só dá pra pôr no ar uma compra paga.' }
    const ehBanner = posicao.startsWith('banner_') || posicao === 'evento' || posicao === 'vaga'
    if (ehBanner && !(patch.arte_url ?? compra.arte_url)) return { erro: 'Envie a arte do banner antes de pôr no ar.' }
    const inicioTexto = String(formData.get('inicia_em') ?? '')
    const inicio = inicioTexto ? new Date(`${inicioTexto}T00:00:00-03:00`) : new Date()
    if (Number.isNaN(inicio.getTime())) return { erro: 'Data de início inválida.' }
    patch.status = 'no_ar'
    patch.inicia_em = inicio.toISOString()
    patch.termina_em = compra.dias > 0 ? new Date(inicio.getTime() + compra.dias * 86400e3).toISOString() : inicio.toISOString()
    if (!patch.link_destino && !compra.link_destino && compra.negocio_id) {
      const { data: n } = await db.from('negocios').select('slug').eq('id', compra.negocio_id).maybeSingle()
      if (n?.slug) patch.link_destino = `/negocio/${n.slug}`
    }
  } else if (acao === 'encerrar') {
    patch.status = 'encerrada'
  } else if (acao === 'cancelar') {
    if (compra.status !== 'aguardando_pagamento') return { erro: 'Compra paga não se cancela aqui: faça o estorno no Mercado Pago (o app atualiza sozinho).' }
    patch.status = 'cancelada'
  }

  const { error } = await db.from('compras_servicos').update(patch).eq('id', id)
  if (error) return { erro: 'Não foi possível salvar.' }
  await auditar(auth.user.id, `compra.${acao}`, id, { de: compra.status, para: patch.status ?? compra.status })
  // notificação patrocinada: sai na hora pra todo mundo (com e sem conta), uma única vez
  if (acao === 'no_ar' && posicao === 'push' && compra.status === 'pago') {
    const fd = new FormData()
    fd.set('publico', 'todos')
    fd.set('titulo', pushTitulo)
    fd.set('corpo', pushTexto)
    const destino = String(patch.link_destino ?? compra.link_destino ?? '')
    if (destino.startsWith('/')) fd.set('url', destino)
    const envio = await enviarComunicado(fd)
    if (envio.erro) return { erro: `Salvo, mas a notificação não saiu: ${envio.erro}` }
  }
  if (acao === 'no_ar' && compra.perfil_id) {
    await notificar([compra.perfil_id], {
      tipo: 'compra',
      titulo: 'Sua divulgação está no ar 🎉',
      corpo: `${compra.nome_servico} começou. Acompanhe as visualizações no painel.`,
      url: '/painel/negocio/divulgacao',
    })
  }
  revalidatePath('/painel/admin/divulgacao')
  revalidatePath('/', 'layout')
  return { erro: null }
}
