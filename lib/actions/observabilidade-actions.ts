'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { lerUserAgent } from '@/lib/observabilidade/detalhes'
import { registrarErro } from '@/lib/observabilidade/registrar-erro'
import { dentroDoLimite, ipDoRequest } from '@/lib/seguranca/rate-limit'

const ORIGENS_CLIENTE = ['tela', 'navegador', 'promessa', 'acao_sem_resposta'] as const

export async function registrarErroCliente(
  mensagem: string,
  stack?: string,
  url?: string,
  extra?: { origem?: string; tela?: string; online?: boolean; digest?: string; instalado?: boolean }
) {
  if (typeof mensagem !== 'string' || !mensagem) return
  // endpoint público (server action) — limita por IP pra não virar canal de flood
  if (!(await dentroDoLimite(`erro-cliente:${ipDoRequest()}`, 20, 60 * 60))) return

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const origem = (ORIGENS_CLIENTE as readonly string[]).includes(extra?.origem ?? '') ? extra!.origem! : 'tela'
  await registrarErro({
    mensagem: mensagem.slice(0, 2000),
    contexto: origem === 'tela' ? 'client (error boundary)' : `client (${origem})`,
    stack: typeof stack === 'string' ? stack : undefined,
    url: typeof url === 'string' ? url : undefined,
    usuarioId: user?.id ?? null,
    // ação sem resposta costuma ser internet ruim: aviso, não erro
    nivel: origem === 'acao_sem_resposta' ? 'warning' : 'error',
    origem,
    detalhes: {
      ...lerUserAgent(headers().get('user-agent')),
      tela: typeof extra?.tela === 'string' ? extra.tela.slice(0, 20) : undefined,
      online: extra?.online,
      app_instalado: extra?.instalado,
      digest: typeof extra?.digest === 'string' ? extra.digest.slice(0, 40) : undefined,
    },
  })
}
