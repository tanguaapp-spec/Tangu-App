import { createClient } from '@/lib/supabase/server'

export const TAMANHO_MAX_IMAGEM = 5 * 1024 * 1024 // 5MB

export function extensaoDoArquivo(arquivo: File) {
  const partes = arquivo.name.split('.')
  const ext = partes.length > 1 ? partes.pop() : null
  return (ext || arquivo.type.split('/')[1] || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Sobe uma imagem pro bucket público `imagens`. Usado por negócio, avaliação, etc. */
export async function enviarImagem(
  supabase: ReturnType<typeof createClient>,
  arquivo: File,
  caminho: string
): Promise<{ url?: string; erro?: string }> {
  if (!arquivo || arquivo.size === 0) return {}
  if (!arquivo.type.startsWith('image/')) return { erro: 'Envie apenas arquivos de imagem.' }
  if (arquivo.size > TAMANHO_MAX_IMAGEM) return { erro: 'Cada imagem deve ter no máximo 5MB.' }

  const { error } = await supabase.storage.from('imagens').upload(caminho, arquivo, {
    upsert: true,
    contentType: arquivo.type,
  })
  if (error) return { erro: error.message }

  const { data } = supabase.storage.from('imagens').getPublicUrl(caminho)
  return { url: data.publicUrl }
}
