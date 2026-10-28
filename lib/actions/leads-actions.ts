'use server'

import { revalidatePath } from 'next/cache'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { createServiceClient } from '@/lib/supabase/server'
import { ETAPAS, type Etapa } from '@/lib/leads/segmentos'

const ETAPAS_VALIDAS = ETAPAS.map(([e]) => e) as readonly string[]

/**
 * Registra o andamento de um contato: etapa, anotação e data de retorno.
 * Cria o lead na primeira vez (um por negócio).
 */
export async function atualizarLead(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const negocioId = String(formData.get('negocio_id') ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(negocioId)) return { erro: 'Negócio inválido.' }
  const etapa = String(formData.get('etapa') ?? 'contatado')
  if (!ETAPAS_VALIDAS.includes(etapa)) return { erro: 'Etapa inválida.' }
  const nota = String(formData.get('nota') ?? '').trim().slice(0, 2000)
  const retorno = String(formData.get('proximo_contato_em') ?? '')
  if (retorno && !/^\d{4}-\d{2}-\d{2}$/.test(retorno)) return { erro: 'Data de retorno inválida.' }
  const origem = String(formData.get('origem') ?? 'manual').slice(0, 40)

  const db = createServiceClient()
  const { data: negocio } = await db.from('negocios').select('nome, whatsapp, telefone').eq('id', negocioId).maybeSingle()
  if (!negocio) return { erro: 'Negócio não encontrado.' }
  const { data: anterior } = await db.from('leads').select('id, etapa').eq('negocio_id', negocioId).maybeSingle()

  const dados = {
    negocio_id: negocioId,
    nome: negocio.nome,
    telefone: negocio.whatsapp || negocio.telefone,
    etapa: etapa as Etapa,
    proximo_contato_em: retorno || null,
    responsavel_id: auth.user.id,
    atualizado_em: new Date().toISOString(),
    ...(anterior ? {} : { origem }),
  }
  const { data: lead, error } = await db.from('leads').upsert(dados, { onConflict: 'negocio_id' }).select('id').single()
  if (error || !lead) return { erro: 'Não foi possível salvar.' }

  const registros = []
  if (!anterior || anterior.etapa !== etapa) {
    registros.push({ lead_id: lead.id, autor_id: auth.user.id, tipo: 'etapa', texto: `Etapa: ${ETAPAS.find(([e]) => e === etapa)?.[1] ?? etapa}` })
  }
  if (nota) registros.push({ lead_id: lead.id, autor_id: auth.user.id, tipo: String(formData.get('tipo') ?? 'nota') === 'whatsapp' ? 'whatsapp' : 'nota', texto: nota })
  if (registros.length) await db.from('interacoes_lead').insert(registros)

  revalidatePath('/painel/admin/leads')
  return { erro: null }
}
