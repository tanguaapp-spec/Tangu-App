'use client'

import { useEffect, useState } from 'react'
import { PerguntaNps } from '@/components/metricas/pergunta-nps'

const CHAVE_ID = 'tangua-aparelho'
const CHAVE_DIA = 'tangua-atividade-dia'
const CHAVE_DIAS = 'tangua-dias-de-uso'

function ler(chave: string) {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}
function gravar(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor)
  } catch {}
}

/**
 * Marca "este aparelho usou o app hoje" (uma vez por dia) para o painel de
 * crescimento. Também decide se é hora de perguntar o NPS (depois de alguns
 * dias de uso, no máximo a cada 90 dias).
 */
export function RegistrarAtividade() {
  const [perguntar, setPerguntar] = useState(false)

  useEffect(() => {
    const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
    if (ler(CHAVE_DIA) === hoje) return
    let id = ler(CHAVE_ID)
    if (!id) {
      id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
      gravar(CHAVE_ID, id)
    }
    gravar(CHAVE_DIA, hoje)
    const dias = Number(ler(CHAVE_DIAS) ?? 0) + 1
    gravar(CHAVE_DIAS, String(dias))
    const params = new URLSearchParams(location.search)
    const origem = params.get('utm_source') || params.get('origem') || (document.referrer ? new URL(document.referrer).hostname : '')
    fetch('/api/atividade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitante: id,
        instalado: window.matchMedia('(display-mode: standalone)').matches,
        pagina: location.pathname,
        origem,
      }),
    })
      .then((r) => r.json())
      .then((r: { nps?: boolean }) => {
        const ultima = Number(ler('tangua-nps-em') ?? 0)
        if (r.nps && dias >= 4 && Date.now() - ultima > 90 * 86400e3) setPerguntar(true)
      })
      .catch(() => undefined)
  }, [])

  return perguntar ? <PerguntaNps aoFechar={() => setPerguntar(false)} /> : null
}
