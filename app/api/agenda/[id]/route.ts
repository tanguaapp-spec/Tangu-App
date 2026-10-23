import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/server'
import { gerarIcs } from '@/lib/agenda/ics'
import { urlDoSite } from '@/lib/site'

/** GET /api/agenda/<id> → arquivo .ics do evento (abre no app de agenda). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new NextResponse('Evento não encontrado', { status: 404 })
  const { data: e } = await createPublicClient()
    .from('avisos_cidade')
    .select('id, titulo, conteudo, local_evento, data_evento')
    .eq('id', params.id)
    .eq('tipo', 'evento')
    .eq('ativo', true)
    .maybeSingle()
  if (!e?.data_evento) return new NextResponse('Evento não encontrado', { status: 404 })
  const ics = gerarIcs({
    id: e.id,
    titulo: e.titulo,
    conteudo: e.conteudo,
    local: e.local_evento,
    inicio: e.data_evento,
    url: `${urlDoSite()}/agenda#evento-${e.id}`,
  })
  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="evento-tangua.ics"',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
