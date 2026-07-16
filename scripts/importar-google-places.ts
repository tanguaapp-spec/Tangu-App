/**
 * IMPORTAÇÃO DE NEGÓCIOS DO GOOGLE PLACES
 * ========================================
 * Roda localmente com: npm run seed:places
 *
 * ⚠️ AVISO IMPORTANTE SOBRE OS TERMOS DO GOOGLE:
 * Os Termos de Serviço da Google Places API restringem o armazenamento
 * permanente de determinados campos (especialmente fora de um mapa do Google).
 * Antes de usar este script em produção, releia a documentação atual em
 * https://developers.google.com/maps/documentation/places/web-service/policies
 * e considere validar com um advogado se o seu caso de uso (diretório próprio)
 * está dentro do permitido, ou se alguns campos (ex: nota do Google) devem
 * ser exibidos via link "Ver no Google Maps" em vez de armazenados.
 *
 * Este script:
 * 1. Busca estabelecimentos por categoria dentro do raio de Tanguá-RJ
 * 2. Busca detalhes de cada lugar (telefone, horário, fotos)
 * 3. Faz upsert na tabela `negocios` usando google_place_id como chave
 *
 * Variáveis de ambiente necessárias (.env.local):
 * - GOOGLE_PLACES_API_KEY
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!

// Centro aproximado de Tanguá-RJ (ajuste conforme necessário)
const CENTRO_TANGUA = { lat: -22.7423, lng: -42.7202 }
const RAIO_METROS = 8000

// Mapeamento: tipo do Google Places -> slug da categoria interna
const MAPA_CATEGORIAS: Record<string, string> = {
  restaurant: 'alimentacao',
  bakery: 'alimentacao',
  cafe: 'alimentacao',
  meal_takeaway: 'alimentacao',
  beauty_salon: 'beleza-estetica',
  hair_care: 'beleza-estetica',
  spa: 'beleza-estetica',
  hardware_store: 'casa-construcao',
  electrician: 'casa-construcao',
  plumber: 'casa-construcao',
  car_repair: 'automotivo',
  car_dealer: 'automotivo',
  gas_station: 'automotivo',
  school: 'educacao',
  doctor: 'saude-bem-estar',
  dentist: 'saude-bem-estar',
  pharmacy: 'saude-bem-estar',
  physiotherapist: 'saude-bem-estar',
  clothing_store: 'moda-vestuario',
  lawyer: 'servicos-profissionais',
  accounting: 'servicos-profissionais',
  real_estate_agency: 'servicos-profissionais',
  electronics_store: 'tecnologia',
}

const TIPOS_BUSCA = Object.keys(MAPA_CATEGORIAS)

async function buscarPlacesPorTipo(tipo: string) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${CENTRO_TANGUA.lat},${CENTRO_TANGUA.lng}`)
  url.searchParams.set('radius', String(RAIO_METROS))
  url.searchParams.set('type', tipo)
  url.searchParams.set('key', GOOGLE_API_KEY)

  const resposta = await fetch(url.toString())
  const dados = await resposta.json()

  if (dados.status !== 'OK' && dados.status !== 'ZERO_RESULTS') {
    console.error(`Erro ao buscar tipo "${tipo}":`, dados.status, dados.error_message)
    return []
  }

  return dados.results ?? []
}

async function buscarDetalhesPlace(placeId: string) {
  const campos = [
    'name', 'formatted_address', 'formatted_phone_number',
    'international_phone_number', 'website', 'opening_hours',
    'rating', 'user_ratings_total', 'photos', 'geometry', 'address_component',
  ].join(',')

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', campos)
  url.searchParams.set('key', GOOGLE_API_KEY)

  const resposta = await fetch(url.toString())
  const dados = await resposta.json()

  if (dados.status !== 'OK') {
    console.error(`Erro ao buscar detalhes de ${placeId}:`, dados.status)
    return null
  }

  return dados.result
}

function montarUrlFoto(photoReference: string) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/photo')
  url.searchParams.set('maxwidth', '800')
  url.searchParams.set('photo_reference', photoReference)
  url.searchParams.set('key', GOOGLE_API_KEY)
  return url.toString()
}

function extrairBairro(addressComponents: any[] = []) {
  const bairro = addressComponents.find((c) => c.types.includes('sublocality') || c.types.includes('neighborhood'))
  return bairro?.long_name ?? null
}

function converterHorario(openingHours: any) {
  if (!openingHours?.weekday_text) return null
  const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
  const resultado: Record<string, string> = {}
  openingHours.weekday_text.forEach((linha: string, i: number) => {
    const partes = linha.split(': ')
    resultado[dias[(i + 1) % 7]] = partes[1] ?? 'Fechado'
  })
  return resultado
}

async function main() {
  if (!GOOGLE_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Faltam variáveis de ambiente. Veja o cabeçalho deste arquivo.')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // categorias internas (id por slug)
  const { data: categorias } = await supabase.from('categorias').select('id, slug')
  const idPorSlug = new Map(categorias?.map((c) => [c.slug, c.id]))

  const placeIdsProcessados = new Set<string>()
  let totalImportados = 0

  for (const tipo of TIPOS_BUSCA) {
    console.log(`Buscando: ${tipo}...`)
    const resultados = await buscarPlacesPorTipo(tipo)

    for (const lugar of resultados) {
      if (placeIdsProcessados.has(lugar.place_id)) continue
      placeIdsProcessados.add(lugar.place_id)

      const detalhes = await buscarDetalhesPlace(lugar.place_id)
      if (!detalhes) continue

      const categoriaSlug = MAPA_CATEGORIAS[tipo] ?? 'outros'
      const fotos = (detalhes.photos ?? []).slice(0, 5).map((p: any) => montarUrlFoto(p.photo_reference))

      const registro = {
        google_place_id: lugar.place_id,
        origem: 'importado',
        nome: detalhes.name,
        categoria_id: idPorSlug.get(categoriaSlug) ?? null,
        endereco: detalhes.formatted_address ?? null,
        bairro: extrairBairro(detalhes.address_component),
        latitude: detalhes.geometry?.location?.lat ?? null,
        longitude: detalhes.geometry?.location?.lng ?? null,
        telefone: detalhes.formatted_phone_number ?? null,
        site: detalhes.website ?? null,
        horario_funcionamento: converterHorario(detalhes.opening_hours),
        foto_capa_url: fotos[0] ?? null,
        galeria: fotos.slice(1),
        nota_google: detalhes.rating ?? null,
        total_avaliacoes_google: detalhes.user_ratings_total ?? null,
        ativo: true,
      }

      const { error } = await supabase
        .from('negocios')
        .upsert(registro, { onConflict: 'google_place_id' })

      if (error) {
        console.error(`Erro ao salvar "${detalhes.name}":`, error.message)
      } else {
        totalImportados++
        console.log(`✓ ${detalhes.name}`)
      }

      // respeita limites de taxa da API
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  console.log(`\nImportação concluída: ${totalImportados} negócios processados.`)
}

main()
