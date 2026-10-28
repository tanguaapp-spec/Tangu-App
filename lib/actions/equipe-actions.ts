'use server'

import { negocioDoPainel } from '@/lib/painel/negocio-atual'
import { recursoLiberado } from '@/lib/planos/recursos'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { notificar } from '@/lib/notificacoes/notificar'

const MAX_MEMBROS = 5

/** Só a dona do negócio mexe na equipe; a gravação vai pelo servidor (RLS bloqueia a API). */
async function negocioDoTitular() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta.' as const }
  const { negocio: atual, papel } = await negocioDoPainel()
  if (!atual || papel !== 'dono') return { erro: 'Só a pessoa dona do negócio pode mudar a equipe.' as const }
  const negocio = { id: atual.id, nome: atual.nome }
  return { user, negocio }
}

export async function adicionarMembro(formData: FormData) {
  const r = await negocioDoTitular()
  if ('erro' in r) return { erro: r.erro }
  if (!(await recursoLiberado(r.negocio.id, 'equipe'))) return { erro: 'Seu plano não inclui equipe. Veja os planos em Plano e assinatura.' }
  const email = z.string().trim().email('Digite um e-mail válido.').safeParse(formData.get('email'))
  if (!email.success) return { erro: email.error.issues[0].message }
  const papel = formData.get('papel') === 'gerente' ? 'gerente' : 'atendente'
  if (!(await dentroDoLimite(`equipe:${r.user.id}`, 20, 3600))) return { erro: 'Muitas tentativas. Aguarde um pouco.' }

  const db = createServiceClient()
  const { data: perfilId } = await db.rpc('perfil_id_por_email', { p_email: email.data })
  // limitado por hora (acima) pra ninguém usar isso pra descobrir quais e-mails têm conta
  if (!perfilId) return { erro: 'Não achamos uma conta com esse e-mail. Peça pra pessoa criar a conta no app primeiro (é grátis).' }
  if (perfilId === r.user.id) return { erro: 'Você já é a dona do negócio.' }

  const { count } = await db.from('membros_negocio').select('perfil_id', { count: 'exact', head: true }).eq('negocio_id', r.negocio.id)
  if ((count ?? 0) >= MAX_MEMBROS) return { erro: `Limite de ${MAX_MEMBROS} pessoas na equipe.` }

  const { error } = await db
    .from('membros_negocio')
    .upsert({ negocio_id: r.negocio.id, perfil_id: perfilId as string, papel, convidado_por: r.user.id }, { onConflict: 'negocio_id,perfil_id' })
  if (error) return { erro: 'Não foi possível adicionar agora.' }

  await notificar([perfilId as string], {
    tipo: 'equipe_convite',
    titulo: `Você agora ajuda a cuidar de ${r.negocio.nome}`,
    corpo: 'Abra o painel do negócio pra cuidar do catálogo, ofertas, novidades e orçamentos.',
    url: '/painel/negocio',
  })
  revalidatePath('/painel/negocio/equipe')
  return { erro: null }
}

export async function removerMembro(perfilId: string) {
  const r = await negocioDoTitular()
  if ('erro' in r) return { erro: r.erro }
  if (!/^[0-9a-f-]{36}$/i.test(perfilId)) return { erro: 'Pessoa inválida.' }
  const { error } = await createServiceClient().from('membros_negocio').delete().eq('negocio_id', r.negocio.id).eq('perfil_id', perfilId)
  if (error) return { erro: 'Não foi possível remover agora.' }
  revalidatePath('/painel/negocio/equipe')
  return { erro: null }
}
