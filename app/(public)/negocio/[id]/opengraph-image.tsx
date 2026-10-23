import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const alt = 'Perfil no Tanguá App'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 3600
export const runtime = 'edge'

/** Cartão que aparece quando o link do perfil é mandado no WhatsApp/Instagram. */
export default async function ImagemCompartilhamento({ params }: { params: { id: string } }) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://invalido.supabase.co', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'x', {
    auth: { persistSession: false },
  })
  const uuid = /^[0-9a-f-]{36}$/i.test(params.id)
  const { data: n } = await db
    .from('negocios')
    .select('*, categoria:categorias(nome)')
    .eq(uuid ? 'id' : 'slug', params.id)
    .eq('ativo', true)
    .maybeSingle()

  const nome = (n?.nome as string | undefined) ?? 'Tanguá App'
  const meta = [n?.categoria?.nome, n?.bairro].filter(Boolean).join(' · ')
  const foto = typeof n?.foto_capa_url === 'string' && /^https:\/\//.test(n.foto_capa_url) ? n.foto_capa_url : null

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0E4D3A', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 40, fontWeight: 700 }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: '#F26A1B', display: 'flex' }} />
            tanguá
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: nome.length > 28 ? 60 : 76, fontWeight: 700, lineHeight: 1.05 }}>{nome}</div>
            {meta && <div style={{ fontSize: 34, color: '#A9D9BC' }}>{meta}</div>}
          </div>
          <div style={{ display: 'flex', alignSelf: 'flex-start', background: '#F26A1B', color: '#13241D', fontSize: 30, fontWeight: 700, padding: '14px 26px', borderRadius: 18 }}>
            Fale direto no WhatsApp
          </div>
        </div>
        {foto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" width={460} height={630} style={{ width: 460, height: 630, objectFit: 'cover' }} />
        )}
      </div>
    ),
    size
  )
}
