import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { detectarTipoImagem, EXTENSAO_POR_TIPO } from '@/lib/storage/assinatura-imagem'

export const TAMANHO_MAX_IMAGEM = 5 * 1024 * 1024 // 5MB — igual ao limite do bucket (migration 0016)

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

  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  const tipo = detectarTipoImagem(bytes)
  if (!tipo) return { erro: 'Formato não aceito. Envie uma foto em JPG, PNG, WebP ou GIF.' }

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
