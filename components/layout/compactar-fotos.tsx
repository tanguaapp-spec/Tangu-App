'use client'

import { useEffect } from 'react'

const LADO_MAX = 1600
const ACIMA_DE = 900 * 1024

/** Reduz a foto no aparelho (lado maior 1600 px, JPEG 82%). Se algo falhar, devolve a original. */
async function compactar(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith('image/') || arquivo.type === 'image/gif' || arquivo.size <= ACIMA_DE) return arquivo
  try {
    const bitmap = await createImageBitmap(arquivo)
    const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.82))
    if (!blob || blob.size >= arquivo.size) return arquivo
    return new File([blob], arquivo.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return arquivo
  }
}

/**
 * Foto de celular tem 3–8 MB e o envio pelo servidor aceita até 4 MB.
 * Em vez de mexer em cada formulário, isto troca o arquivo escolhido em
 * qualquer campo de imagem por uma versão reduzida, antes do envio.
 */
export function CompactarFotos() {
  useEffect(() => {
    const aoEscolher = async (e: Event) => {
      const campo = e.target as HTMLInputElement | null
      if (!campo || campo.type !== 'file' || !campo.files?.length || campo.dataset.compactado === '1') return
      if (!Array.from(campo.files).some((f) => f.type.startsWith('image/') && f.size > ACIMA_DE)) return
      if (typeof DataTransfer === 'undefined') return
      campo.setAttribute('aria-busy', 'true')
      const novos = await Promise.all(Array.from(campo.files).map(compactar))
      const dt = new DataTransfer()
      novos.forEach((f) => dt.items.add(f))
      campo.dataset.compactado = '1'
      campo.files = dt.files
      campo.removeAttribute('aria-busy')
      // avisa quem mostra prévia (React escuta "change"); a marca evita repetir
      campo.dispatchEvent(new Event('change', { bubbles: true }))
      delete campo.dataset.compactado
    }
    document.addEventListener('change', aoEscolher, true)
    return () => document.removeEventListener('change', aoEscolher, true)
  }, [])
  return null
}
