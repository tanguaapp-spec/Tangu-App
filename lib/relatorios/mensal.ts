import { createServiceClient } from '@/lib/supabase/server'

export type RelatorioMensal = {
  mes: string
  dias: { dia: string; visitas: number; whatsapp: number; favoritos: number }[]
  totais: { visitas: number; whatsapp: number; favoritos: number; avaliacoes: number; notaMedia: number | null; orcamentos: number; cuponsPegos: number }
  origens: Record<string, number>
  mesAnterior: { visitas: number; whatsapp: number }
}

/** "2026-11" → limites do mês no fuso de Tanguá (UTC-3, sem horário de verão). */
function limitesMes(mes: string) {
  const [a, m] = mes.split('-').map(Number)
  const inicio = new Date(Date.UTC(a, m - 1, 1, 3))
  const fim = new Date(Date.UTC(a, m, 1, 3))
  return { inicio, fim, diasNoMes: new Date(Date.UTC(a, m, 0)).getUTCDate() }
}

export function mesValido(mes: string | undefined) {
  return !!mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes)
}

/** Números do mês de um negócio (visitas, cliques, avaliações, orçamentos, cupons). Só no servidor. */
export async function montarRelatorioMensal(negocioId: string, mes: string): Promise<RelatorioMensal> {
  const db = createServiceClient()
  const { inicio, fim, diasNoMes } = limitesMes(mes)
  const ant = limitesMes(new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 2, 15)).toISOString().slice(0, 7))
  const [eventos, eventosAnt, avaliacoes, orcamentos, cupons] = await Promise.all([
    db.from('eventos_perfil').select('tipo, origem, criado_em').eq('negocio_id', negocioId).gte('criado_em', inicio.toISOString()).lt('criado_em', fim.toISOString()).limit(50000),
    db.from('eventos_perfil').select('tipo').eq('negocio_id', negocioId).gte('criado_em', ant.inicio.toISOString()).lt('criado_em', ant.fim.toISOString()).in('tipo', ['visualizacao', 'clique_whatsapp']).limit(50000),
    db.from('avaliacoes').select('nota').eq('negocio_id', negocioId).gte('criado_em', inicio.toISOString()).lt('criado_em', fim.toISOString()),
    db.from('pedido_destinatarios').select('pedido_id', { count: 'exact', head: true }).eq('negocio_id', negocioId).gte('criado_em', inicio.toISOString()).lt('criado_em', fim.toISOString()),
    db.from('cupom_resgates').select('id, cupom:cupons!inner(negocio_id)', { count: 'exact', head: true }).eq('cupom.negocio_id', negocioId).gte('criado_em', inicio.toISOString()).lt('criado_em', fim.toISOString()),
  ])

  const dias = Array.from({ length: diasNoMes }, (_, i) => ({ dia: `${mes}-${String(i + 1).padStart(2, '0')}`, visitas: 0, whatsapp: 0, favoritos: 0 }))
  const origens: Record<string, number> = {}
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
  for (const e of eventos.data ?? []) {
    const d = dias.find((x) => x.dia === fmt.format(new Date(e.criado_em)))
    if (!d) continue
    if (e.tipo === 'visualizacao') {
      d.visitas++
      origens[e.origem ?? 'direto'] = (origens[e.origem ?? 'direto'] ?? 0) + 1
    } else if (e.tipo === 'clique_whatsapp') d.whatsapp++
    else if (e.tipo === 'favorito') d.favoritos++
  }
  const notas = (avaliacoes.data ?? []).map((a) => a.nota as number)
  return {
    mes,
    dias,
    origens,
    totais: {
      visitas: dias.reduce((s, d) => s + d.visitas, 0),
      whatsapp: dias.reduce((s, d) => s + d.whatsapp, 0),
      favoritos: dias.reduce((s, d) => s + d.favoritos, 0),
      avaliacoes: notas.length,
      notaMedia: notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null,
      orcamentos: orcamentos.count ?? 0,
      cuponsPegos: cupons.count ?? 0,
    },
    mesAnterior: {
      visitas: (eventosAnt.data ?? []).filter((e) => e.tipo === 'visualizacao').length,
      whatsapp: (eventosAnt.data ?? []).filter((e) => e.tipo === 'clique_whatsapp').length,
    },
  }
}

/** Planilha (CSV com ; e BOM, abre direto no Excel em português). */
export function relatorioParaCsv(r: RelatorioMensal, nomeNegocio: string) {
  const linhas = [
    [`Relatório Tanguá App — ${nomeNegocio} — ${r.mes}`],
    [],
    ['Dia', 'Visitas ao perfil', 'Cliques no WhatsApp', 'Novos favoritos'],
    ...r.dias.map((d) => [d.dia.split('-').reverse().join('/'), d.visitas, d.whatsapp, d.favoritos]),
    ['Total', r.totais.visitas, r.totais.whatsapp, r.totais.favoritos],
    [],
    ['Mês anterior: visitas', r.mesAnterior.visitas],
    ['Mês anterior: cliques no WhatsApp', r.mesAnterior.whatsapp],
    ['Avaliações recebidas', r.totais.avaliacoes],
    ['Nota média das avaliações do mês', r.totais.notaMedia === null ? '' : r.totais.notaMedia.toFixed(1).replace('.', ',')],
    ['Pedidos de orçamento recebidos', r.totais.orcamentos],
    ['Cupons pegos por clientes', r.totais.cuponsPegos],
    [],
    ['De onde vieram as visitas', 'Visitas'],
    ...Object.entries(r.origens).sort((a, b) => b[1] - a[1]),
  ]
  const celula = (v: unknown) => {
    const t = String(v ?? '')
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  return '﻿' + linhas.map((l) => l.map(celula).join(';')).join('\r\n')
}
