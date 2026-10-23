import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { detectarTipoImagem, EXTENSAO_POR_TIPO, type TipoImagemAceito } from '@/lib/storage/assinatura-imagem'

export const TAMANHO_MAX_IMAGEM = 5 * 1024 * 1024 // 5MB — igual ao limite do bucket (migration 0016)

const LADO_MAXIMO = 1600

/**
 * Foto de celular (4000px, 5MB) vira WebP de até 1600px: carrega rápido no
 * 4G e gasta menos do plano de dados de quem vê. Gira pela orientação EXIF
 * e descarta os metadados (inclusive localização GPS da foto). GIF fica como
 * está (pode ser animado). Se o sharp falhar, sobe o original.
 */
export async function otimizarImagem(bytes: Uint8Array, tipo: string): Promise<Uint8Array | null> {
  if (tipo === 'image/gif') return null
  try {
    const sharp = (await import('sharp')).default
    const saida = await sharp(bytes, { failOn: 'error' })
      .rotate()
      .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
    return new Uint8Array(saida)
  } catch (err) {
    console.error('Falha ao otimizar imagem (sobe o original):', err)
    return null
  }
}

/**
 * Sobe uma imagem pro bucket público `imagens`.
 *
 * `pasta` precisa começar com `negocios/<negocio_id>` (dono do negócio) ou
 * `usuarios/<user_id>` (o próprio usuário) — é o que a policy de storage
 * aceita. O nome do arquivo é sempre gerado aqui (UUID + extensão do tipo
 * REAL detectado pelos bytes), nunca vem do usuário.
 */
export async function enviarImagem(
  supabase: ReturnType<typeof createClient>,
  arquivo: File,
  pasta: string
): Promise<{ url?: string; erro?: string }> {
  if (!arquivo || arquivo.size === 0) return {}
  if (arquivo.size > TAMANHO_MAX_IMAGEM) return { erro: 'Cada imagem deve ter no máximo 5MB.' }

  let bytes: Uint8Array = new Uint8Array(await arquivo.arrayBuffer())
  let tipo: TipoImagemAceito | null = detectarTipoImagem(bytes)
  if (!tipo) return { erro: 'Formato não aceito. Envie uma foto em JPG, PNG, WebP ou GIF.' }

  const otimizada = await otimizarImagem(bytes, tipo)
  if (otimizada) {
    bytes = otimizada
    tipo = 'image/webp'
  }

  const caminho = `${pasta.replace(/\/+$/, '')}/${randomUUID()}.${EXTENSAO_POR_TIPO[tipo]}`
  const { error } = await supabase.storage.from('imagens').upload(caminho, bytes, {
    contentType: tipo,
    cacheControl: '31536000', // nome único por upload → pode cachear pra sempre
    upsert: false,
  })
  if (error) {
    console.error('Falha no upload de imagem:', error.message)
    return { erro: 'Não foi possível enviar a imagem agora. Tente de novo em instantes.' }
  }

  const { data } = supabase.storage.from('imagens').getPublicUrl(caminho)
  return { url: data.publicUrl }
}
