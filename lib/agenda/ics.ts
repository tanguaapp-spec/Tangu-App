/**
 * Arquivo .ics (calendário) de um evento do mural — abre no app de agenda
 * do celular. Sem horário de término informado, assume 2 horas.
 */
function data(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapar(texto: string) {
  return texto
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/[,;]/g, (c) => `\\${c}`)
}

export function gerarIcs(e: { id: string; titulo: string; conteudo?: string | null; local?: string | null; inicio: string; url: string }) {
  const inicio = new Date(e.inicio)
  const fim = new Date(inicio.getTime() + 2 * 3600e3)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tangua App//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.id}@tangua-app`,
    `DTSTAMP:${data(new Date())}`,
    `DTSTART:${data(inicio)}`,
    `DTEND:${data(fim)}`,
    `SUMMARY:${escapar(e.titulo)}`,
    e.conteudo ? `DESCRIPTION:${escapar(e.conteudo.slice(0, 500))}` : null,
    e.local ? `LOCATION:${escapar(e.local)}` : null,
    `URL:${e.url}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapar(e.titulo)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')
}

/** Link "adicionar ao Google Agenda". */
export function linkGoogleAgenda(e: { titulo: string; conteudo?: string | null; local?: string | null; inicio: string }) {
  const inicio = new Date(e.inicio)
  const fim = new Date(inicio.getTime() + 2 * 3600e3)
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.titulo,
    dates: `${data(inicio)}/${data(fim)}`,
    details: (e.conteudo ?? '').slice(0, 500),
    location: e.local ?? 'Tanguá - RJ',
  })
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}
