'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { z } from 'zod'
import type { TipoConteudoDenuncia } from '@/lib/types/database'

async function requireAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { erro: 'Não autenticado.' as const }

  const { data: perfil } = await supabase.from('perfis').select('papel').eq('id', user.id).single()

  if (!perfil || perfil.papel !== 'admin') {
    return { erro: 'Acesso negado (admin).' as const }
  }

  return { supabase, user } as const
}

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
    return { erro: error.message }
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
    if (denuncia.tipo_conteudo === 'avaliacao') {
      await supabase.from('avaliacoes').delete().eq('id', denuncia.conteudo_id)
    } else if (denuncia.tipo_conteudo === 'aviso') {
      await supabase.from('avisos_cidade').update({ ativo: false }).eq('id', denuncia.conteudo_id)
    } else if (denuncia.tipo_conteudo === 'resposta_pergunta') {
      await supabase.from('respostas_pergunta').delete().eq('id', denuncia.conteudo_id)
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

  if (error) return { erro: error.message }

  revalidatePath('/painel/admin/denuncias')
  revalidatePath('/mural')
  return { erro: null }
}
