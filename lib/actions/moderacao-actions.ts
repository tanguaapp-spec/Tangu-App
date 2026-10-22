'use server'

import { traduzirErroBanco } from '@/lib/planos/limites'
import { notificar } from '@/lib/notificacoes/notificar'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { z } from 'zod'
import type { TipoConteudoDenuncia } from '@/lib/types/database'

const requireAdmin = verificarAdmin

const schemaDenuncia = z.object({
  motivo: z.string().trim().min(1, 'Conte pra gente o que há de errado.').max(500, 'Motivo muito longo (máximo 500 caracteres).'),
})

/**
 * Qualquer usuário logado pode denunciar uma avaliação, um aviso/pergunta do
 * mural ou uma resposta de negócio a uma pergunta. `negocioId` é opcional —
 * só usado como contexto pra facilitar a revisão no painel admin.
 */
export async function denunciarConteudo(
  tipoConteudo: TipoConteudoDenuncia,
  conteudoId: string,
  motivo: string,
  negocioId?: string | null
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa entrar para denunciar um conteúdo.' }
  }

  const TIPOS_VALIDOS: TipoConteudoDenuncia[] = ['avaliacao', 'aviso', 'resposta_pergunta', 'negocio', 'post']
  if (!TIPOS_VALIDOS.includes(tipoConteudo) || !/^[0-9a-f-]{36}$/i.test(String(conteudoId))) {
    return { erro: 'Conteúdo inválido.' }
  }

  const validado = schemaDenuncia.safeParse({ motivo })
  if (!validado.success) {
    return { erro: validado.error.issues[0].message }
  }

  const podeDenunciar = await dentroDoLimite(`denuncia:${user.id}`, 15, 60 * 60)
  if (!podeDenunciar) {
    return { erro: 'Muitas denúncias enviadas. Aguarde um pouco e tente de novo.' }
  }

  const { error } = await supabase.from('denuncias').insert({
    tipo_conteudo: tipoConteudo,
    conteudo_id: conteudoId,
    negocio_id: negocioId || null,
    motivo: validado.data.motivo,
    denunciante_id: user.id,
  })

  if (error) {
    if (error.code === '23505') {
      return { erro: 'Você já denunciou este conteúdo.' }
    }
    return { erro: traduzirErroBanco(error) }
  }

  return { erro: null }
}

/**
 * Admin revisa uma denúncia: "remover" de fato apaga/desativa o conteúdo
 * denunciado (avaliação apagada, aviso desativado, resposta apagada) e
 * marca a denúncia como resolvida; "arquivar" só marca como analisada sem
 * mexer no conteúdo (denúncia sem procedência).
 */
export async function revisarDenuncia(denunciaId: string, acao: 'remover' | 'arquivar') {
  const auth = await requireAdmin()
  if ('erro' in auth) return { erro: auth.erro }

  const { supabase, user } = auth

  const { data: denuncia, error: erroBusca } = await supabase
    .from('denuncias')
    .select('*')
    .eq('id', denunciaId)
    .single()

  if (erroBusca || !denuncia) return { erro: 'Denúncia não encontrada.' }

  if (acao === 'remover') {
    // descobre o autor ANTES de remover, pra avisar com o motivo
    const admin = createServiceClient()
    let autorId: string | null = null
    let descricao = 'Um conteúdo seu'
    if (denuncia.tipo_conteudo === 'avaliacao') {
      const { data } = await admin.from('avaliacoes').select('autor_id').eq('id', denuncia.conteudo_id).maybeSingle()
      autorId = data?.autor_id ?? null
      descricao = 'Uma avaliação sua'
      await supabase.from('avaliacoes').delete().eq('id', denuncia.conteudo_id)
    } else if (denuncia.tipo_conteudo === 'aviso') {
      const { data } = await admin.from('avisos_cidade').select('publicado_por').eq('id', denuncia.conteudo_id).maybeSingle()
      autorId = data?.publicado_por ?? null
      descricao = 'Uma publicação sua no mural'
      await supabase.from('avisos_cidade').update({ ativo: false }).eq('id', denuncia.conteudo_id)
    } else if (denuncia.tipo_conteudo === 'resposta_pergunta') {
      const { data } = await admin.from('respostas_pergunta').select('autor_id').eq('id', denuncia.conteudo_id).maybeSingle()
      autorId = data?.autor_id ?? null
      descricao = 'Uma indicação sua no mural'
      await supabase.from('respostas_pergunta').delete().eq('id', denuncia.conteudo_id)
    } else if (denuncia.tipo_conteudo === 'post') {
      const { data } = await admin.from('posts_negocio').select('autor_id').eq('id', denuncia.conteudo_id).maybeSingle()
      autorId = data?.autor_id ?? null
      descricao = 'Uma novidade do seu negócio'
      await supabase.from('posts_negocio').update({ ativo: false }).eq('id', denuncia.conteudo_id)
    } else if (denuncia.tipo_conteudo === 'negocio') {
      // perfil inteiro: suspende (reversível), nunca apaga
      const { data } = await admin.from('negocios').select('reivindicado_por').eq('id', denuncia.conteudo_id).maybeSingle()
      autorId = data?.reivindicado_por ?? null
      descricao = 'O perfil do seu negócio'
      await supabase.from('negocios').update({ ativo: false }).eq('id', denuncia.conteudo_id)
    }

    if (autorId) {
      await notificar([autorId], {
        tipo: 'moderacao',
        titulo: `${descricao} foi removido(a) pela moderação`,
        corpo: `Motivo informado na denúncia: "${denuncia.motivo.slice(0, 200)}". Se você discorda, responda pelo suporte.`,
        url: '/ajuda/contato?assunto=publicacao',
      })
    }
  }

  const { error } = await supabase
    .from('denuncias')
    .update({
      status: acao === 'remover' ? 'removido' : 'arquivado',
      revisado_por: user.id,
      revisado_em: new Date().toISOString(),
    })
    .eq('id', denunciaId)

  if (error) return { erro: traduzirErroBanco(error) }

  await createServiceClient()
    .from('registros_auditoria')
    .insert({ ator_id: user.id, acao: `denuncia.${acao}`, entidade: denuncia.tipo_conteudo, entidade_id: denuncia.conteudo_id, dados: { denuncia: denunciaId, motivo: denuncia.motivo } })
    .then(() => undefined, () => undefined)

  revalidatePath('/painel/admin/denuncias')
  revalidatePath('/mural')
  return { erro: null }
}
