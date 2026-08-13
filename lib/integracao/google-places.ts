/**
 * Funções compartilhadas de integração com a Google Places API — usadas
 * tanto pelo importador público (scripts/importar-google-places.ts, que
 * publica direto em `negocios`) quanto pela prospecção privada do admin
 * (lib/actions/prospeccao-actions.ts, que só guarda em `prospeccoes_negocios`,
 * nunca pública).
 *
 * ⚠️ Ver aviso sobre os Termos de Serviço da Google Places no cabeçalho de
 * scripts/importar-google-places.ts antes de usar em produção.
 */

// Centro aproximado de Tanguá-RJ (ajuste conforme necessário)
export const CENTRO_TANGUA = { lat: -22.7423, lng: -42.7202 }
export const RAIO_METROS = 8000

// Mapeamento: tipo do Google Places -> slug da categoria interna
export const MAPA_CATEGORIAS: Record<string, string> = {
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

export const TIPOS_BUSCA = Object.keys(MAPA_CATEGORIAS)

export async function buscarPlacesPorTipo(tipo: string, apiKey: string) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${CENTRO_TANGUA.lat},${CENTRO_TANGUA.lng}`)
  url.searchParams.set('radius', String(RAIO_METROS))
  url.searchParams.set('type', tipo)
  url.searchParams.set('key', apiKey)

  const resposta = await fetch(url.toString())
  const dados = await resposta.json()

  if (dados.status !== 'OK' && dados.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places retornou "${dados.status}" ao buscar tipo "${tipo}": ${dados.error_message ?? ''}`)
  }

  return (dados.results ?? []) as any[]
}

export async function buscarDetalhesPlace(placeId: string, apiKey: string) {
  const campos = [
    'name',
    'formatted_address',
    'formatted_phone_number',
    'international_phone_number',
    'website',
    'rating',
    'user_ratings_total',
    'geometry',
    'address_component',
  ].join(',')

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', campos)
  url.searchParams.set('key', apiKey)

  const resposta = await fetch(url.toString())
  const dados = await resposta.json()

  if (dados.status !== 'OK') return null
  return dados.result
}

export function extrairBairro(addressComponents: any[] = []) {
  const bairro = addressComponents.find((c) => c.types.includes('sublocality') || c.types.includes('neighborhood'))
  return bairro?.long_name ?? null
}
