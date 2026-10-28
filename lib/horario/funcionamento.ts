/**
 * Horário de funcionamento → "aberto agora", calculado na hora (fuso de
 * Tanguá). O dono preenche um texto por dia ("08:00-18:00", "Fechado",
 * "08:00-12:00, 14:00-18:00"); aqui isso vira intervalos em minutos.
 * Nada de chute: dia sem horário ou texto que não dá pra ler = desconhecido.
 */

export const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const
export type Dia = (typeof DIAS)[number]

export const ROTULO_DIA: Record<Dia, string> = {
  dom: 'Domingo',
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
}

/** Ordem de exibição (semana começando na segunda, como o comércio pensa). */
export const DIAS_EXIBICAO: Dia[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']

export type Intervalo = [number, number] // minutos desde 00:00; fim pode passar de 1440 (vira a noite)

const FECHADO = /^(fechado|fechada|não abre|nao abre|-)$/i

function minutos(h: string, m?: string) {
  const hh = Number(h)
  const mm = m ? Number(m) : 0
  if (!Number.isInteger(hh) || !Number.isInteger(mm) || hh > 24 || mm > 59) return null
  return hh * 60 + mm
}

/** "08:00-18:00", "8h às 18h", "08-12 e 14-18", "24h" → intervalos; "Fechado" → []; ilegível → null */
export function lerHorarioDia(texto: string | null | undefined): Intervalo[] | null {
  const t = (texto ?? '').trim().toLowerCase()
  if (!t) return null
  if (FECHADO.test(t)) return []
  if (/^(24 ?h(oras)?|aberto 24 ?h)$/.test(t)) return [[0, 1440]]

  const partes = t.split(/\s*(?:,|;|\be\b|\/)\s*/).filter(Boolean)
  const intervalos: Intervalo[] = []
  for (const parte of partes) {
    const m = parte.match(/^(\d{1,2})(?:[:h.](\d{2}))?\s*h?\s*(?:-|–|às|as|a|até|ate)\s*(\d{1,2})(?:[:h.](\d{2}))?\s*h?$/)
    if (!m) return null
    const inicio = minutos(m[1], m[2])
    let fim = minutos(m[3], m[4])
    if (inicio === null || fim === null) return null
    if (fim <= inicio) fim += 1440 // fecha depois da meia-noite
    intervalos.push([inicio, fim])
  }
  return intervalos.length ? intervalos : null
}

/** Dia da semana e minuto atual no horário de Brasília. */
export function agoraEmTangua(data = new Date()): { dia: Dia; minuto: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(data)
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''
  const mapa: Record<string, Dia> = { Sun: 'dom', Mon: 'seg', Tue: 'ter', Wed: 'qua', Thu: 'qui', Fri: 'sex', Sat: 'sab' }
  return { dia: mapa[valor('weekday')] ?? 'seg', minuto: Number(valor('hour')) * 60 + Number(valor('minute')) }
}

export function formatarHora(min: number) {
  const m = ((min % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`
}

export type SituacaoHorario = {
  /** null = não dá pra saber (sem horário cadastrado ou texto ilegível) */
  aberto: boolean | null
  /** frase curta pro selo: "Aberto até 19h", "Fechado · abre amanhã às 9h" */
  rotulo: string | null
}

/**
 * Situação agora. `manual` é o "aberto agora" antigo, ligado à mão pelo dono:
 * só vale quando não há horário cadastrado.
 */
export function situacaoHorario(
  horario: Record<string, string> | null | undefined,
  manual: boolean | null = null,
  data = new Date()
): SituacaoHorario {
  const temHorario = !!horario && Object.values(horario).some((v) => v && v.trim())
  if (!temHorario) {
    if (manual === null) return { aberto: null, rotulo: null }
    return { aberto: manual, rotulo: manual ? 'Aberto agora' : 'Fechado agora' }
  }

  const { dia, minuto } = agoraEmTangua(data)
  const idx = DIAS.indexOf(dia)
  const ontem = DIAS[(idx + 6) % 7]

  // turno de ontem que atravessou a meia-noite
  for (const [ini, fim] of lerHorarioDia(horario![ontem]) ?? []) {
    if (fim > 1440 && minuto < fim - 1440 && minuto >= ini - 1440) return { aberto: true, rotulo: `Aberto até ${formatarHora(fim)}` }
  }

  const hoje = lerHorarioDia(horario![dia])
  for (const [ini, fim] of hoje ?? []) {
    if (minuto >= ini && minuto < fim) {
      return { aberto: true, rotulo: fim >= 1440 && ini === 0 ? 'Aberto 24h' : `Aberto até ${formatarHora(fim)}` }
    }
  }
  if (hoje === null && horario![dia]?.trim()) return { aberto: null, rotulo: null } // texto ilegível

  // fechado: quando abre de novo?
  const maisTarde = (hoje ?? []).find(([ini]) => ini > minuto)
  if (maisTarde) return { aberto: false, rotulo: `Fechado · abre às ${formatarHora(maisTarde[0])}` }
  for (let i = 1; i <= 7; i++) {
    const d = DIAS[(idx + i) % 7]
    const prox = lerHorarioDia(horario![d])
    if (prox && prox.length) {
      const quando = i === 1 ? 'amanhã' : ROTULO_DIA[d].toLowerCase()
      return { aberto: false, rotulo: `Fechado · abre ${quando} às ${formatarHora(prox[0][0])}` }
    }
  }
  return { aberto: false, rotulo: 'Fechado agora' }
}

/** Linhas pro quadro "Horário", juntando dias seguidos iguais ("Seg a sex  09:00–19:00"). */
export function resumoSemana(horario: Record<string, string> | null | undefined): { dias: string; horas: string; fechado: boolean }[] {
  if (!horario) return []
  const curto: Record<Dia, string> = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' }
  const linhas: { dias: Dia[]; texto: string }[] = []
  for (const d of DIAS_EXIBICAO) {
    const texto = (horario[d] ?? '').trim()
    if (!texto) continue
    const ultima = linhas[linhas.length - 1]
    const anterior = ultima ? ultima.dias[ultima.dias.length - 1] : null
    const seguido = anterior && DIAS_EXIBICAO.indexOf(d) === DIAS_EXIBICAO.indexOf(anterior) + 1
    if (ultima && seguido && ultima.texto.toLowerCase() === texto.toLowerCase()) ultima.dias.push(d)
    else linhas.push({ dias: [d], texto })
  }
  return linhas.map(({ dias, texto }) => {
    const fechado = lerHorarioDia(texto)?.length === 0
    const rotuloDias =
      dias.length === 1 ? ROTULO_DIA[dias[0]] : dias.length === 2 ? `${curto[dias[0]]} e ${curto[dias[1]]}` : `${curto[dias[0]]} a ${curto[dias[dias.length - 1]].toLowerCase()}`
    return { dias: rotuloDias, horas: fechado ? 'Fechado' : texto.replace(/\s*-\s*/g, '–'), fechado }
  })
}

export type HorarioEspecial = { data: string; fechado: boolean; abre: string | null; fecha: string | null; motivo: string | null }

/**
 * Feriado/horário diferente cadastrado pelo dono vale por cima do horário
 * da semana, nos próximos 7 dias (o dia da semana daquela data é trocado).
 * Assim "aberto agora", "abre amanhã às…" e o filtro da busca acertam sem
 * mudar o resto do código. Devolve também o aviso de hoje/amanhã.
 */
export function aplicarEspeciais(
  horario: Record<string, string> | null | undefined,
  especiais: HorarioEspecial[],
  agora = new Date()
): { horario: Record<string, string> | null; aviso: string | null } {
  if (!especiais.length) return { horario: horario ?? null, aviso: null }
  const fmt = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
  const proximos = Array.from({ length: 7 }, (_, i) => fmt(new Date(agora.getTime() + i * 86400e3)))
  const copia: Record<string, string> = { ...(horario ?? {}) }
  let aviso: string | null = null
  for (const e of especiais) {
    const pos = proximos.indexOf(e.data)
    if (pos < 0) continue
    const dia = DIAS[new Date(`${e.data}T12:00:00Z`).getUTCDay()]
    const hhmm = (t: string | null) => (t ?? '').slice(0, 5)
    copia[dia] = e.fechado ? 'Fechado' : `${hhmm(e.abre)}-${hhmm(e.fecha)}`
    if (pos <= 1 && !aviso) {
      const quando = pos === 0 ? 'Hoje' : 'Amanhã'
      aviso = `${quando}: ${e.fechado ? 'fechado' : `horário especial, ${hhmm(e.abre)} às ${hhmm(e.fecha)}`}${e.motivo ? ` (${e.motivo})` : ''}`
    }
  }
  return { horario: copia, aviso }
}
