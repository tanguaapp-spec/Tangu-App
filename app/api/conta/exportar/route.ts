import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { diaISO } from '@/lib/datas'

export const dynamic = 'force-dynamic'

/**
 * Portabilidade (LGPD art. 18, V): tudo que é da pessoa, em JSON.
 * Lê com o cliente do próprio usuário (RLS garante que é só dele); só as
 * denúncias feitas por ela usam service role, filtradas pelo id dela.
 */
export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Entre na sua conta.' }, { status: 401 })
  if (!(await dentroDoLimite(`exportar:${user.id}`, 5, 24 * 60 * 60))) {
    return NextResponse.json({ erro: 'Limite de exportações por dia atingido.' }, { status: 429 })
  }

  const [perfil, avaliacoes, favoritos, negocio, chamados, notificacoes, pontos, cartoes] = await Promise.all([
    supabase.rpc('meu_perfil').maybeSingle(),
    supabase.from('avaliacoes').select('negocio_id, nota, comentario, foto_url, criado_em').eq('autor_id', user.id),
    supabase.from('favoritos').select('negocio_id, criado_em').eq('perfil_id', user.id),
    supabase.from('negocios').select('*').eq('reivindicado_por', user.id),
    supabase.from('chamados_suporte').select('id, categoria, assunto, status, criado_em, mensagens:mensagens_chamado(corpo, do_suporte, criado_em)').eq('perfil_id', user.id),
    supabase.from('notificacoes').select('tipo, titulo, corpo, criado_em, lida_em').eq('perfil_id', user.id).limit(1000),
    supabase.from('pontos_laranjas').select('quantidade, motivo, criado_em').eq('perfil_id', user.id),
    supabase.from('cartoes_fidelidade').select('negocio_id, carimbos, meta, completos, atualizado_em').eq('perfil_id', user.id),
  ])

  // um bloco por negócio da conta
  const dadosNegocios: Record<string, unknown>[] = []
  for (const perfilNegocio of negocio.data ?? []) {
    const id = perfilNegocio.id
    const [produtos, posts, cupons, assinaturas, pagamentos] = await Promise.all([
      supabase.from('produtos_servicos').select('*').eq('negocio_id', id),
      supabase.from('posts_negocio').select('*').eq('negocio_id', id),
      supabase.from('cupons').select('*').eq('negocio_id', id),
      supabase.from('assinaturas').select('plano_id, status, valor_centavos, periodo_atual_inicio, periodo_atual_fim, criado_em, cancelada_em').eq('negocio_id', id),
      supabase.from('pagamentos').select('status, valor_centavos, pago_em, criado_em').eq('negocio_id', id),
    ])
    dadosNegocios.push({
      perfil: perfilNegocio,
      produtos: produtos.data ?? [],
      novidades: posts.data ?? [],
      ofertas: cupons.data ?? [],
      assinaturas: assinaturas.data ?? [],
      pagamentos: pagamentos.data ?? [],
    })
  }

  const { data: denuncias } = await createServiceClient()
    .from('denuncias')
    .select('tipo_conteudo, motivo, status, criado_em')
    .eq('denunciante_id', user.id)

  // dados da 0023 (antes dela, as consultas só voltam vazias)
  const svc = createServiceClient()
  const [nps, sugNoticias, sugEventos, compras] = await Promise.all([
    svc.from('respostas_nps').select('nota, comentario, criado_em').eq('perfil_id', user.id),
    svc.from('noticias').select('titulo, status, criado_em').eq('sugerida_por', user.id),
    svc.from('sugestoes_evento').select('titulo, status, data_evento, criado_em').eq('perfil_id', user.id),
    svc.from('compras_servicos').select('nome_servico, dias, valor_centavos, status, pago_em, criado_em').eq('perfil_id', user.id),
  ])

  const exportacao = {
    gerado_em: new Date().toISOString(),
    aviso: 'Cópia dos seus dados pessoais no Tanguá App. Guarde em local seguro.',
    conta: { email: user.email, criada_em: user.created_at },
    perfil: perfil.data ?? null,
    avaliacoes: avaliacoes.data ?? [],
    favoritos: favoritos.data ?? [],
    negocios: dadosNegocios,
    chamados_suporte: chamados.data ?? [],
    notificacoes: notificacoes.data ?? [],
    pontos_laranjas: pontos.data ?? [],
    cartoes_fidelidade: cartoes.data ?? [],
    denuncias_enviadas: denuncias ?? [],
    pesquisa_satisfacao: nps.data ?? [],
    noticias_sugeridas: sugNoticias.data ?? [],
    eventos_sugeridos: sugEventos.data ?? [],
    compras_de_divulgacao: compras.data ?? [],
  }

  return new NextResponse(JSON.stringify(exportacao, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="meus-dados-tangua-app-${diaISO()}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
