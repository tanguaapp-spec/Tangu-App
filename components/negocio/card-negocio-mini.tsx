import Link from 'next/link'
import { iconeCategoria } from '@/lib/ui/icone-categoria'
import { rotuloModalidade } from '@/lib/modalidades'
import type { Negocio } from '@/lib/types/database'

/** Card compacto (2 colunas) usado em vitrines como "Perto de você" na home. */
export function CardNegocioMini({ negocio }: { negocio: Negocio }) {
  const Icone = iconeCategoria(negocio.categoria?.icone)
  const subtitulo =
    negocio.bairro ||
    (negocio.modalidades_atendimento?.[0] ? rotuloModalidade(negocio.modalidades_atendimento[0]) : null) ||
    negocio.categoria?.nome ||
    ''

  return (
    <Link
      href={`/negocio/${negocio.id}`}
      className="rounded-2xl bg-barro-50 p-3 transition-transform active:scale-[0.97]"
    >
      <span className="flex h-14 items-center justify-center rounded-xl bg-barro-900 text-white">
        <Icone className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="mt-2 block truncate text-[13px] font-semibold text-barro-900">{negocio.nome}</span>
      {subtitulo && <span className="block truncate text-[11px] text-barro-500">{subtitulo}</span>}
    </Link>
  )
}
