import Link from 'next/link'
import { MarcaTangua } from '@/components/marca/logo-tangua'

// Só no computador: no celular esses links ficam na aba "Você".
export function Rodape() {
  return (
    <footer className="mt-12 hidden bg-serra-escuro text-[#E3F0E8] md:block">
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-x-12 gap-y-6 px-6 py-8 text-sm">
        <div className="flex max-w-xs flex-col gap-2">
          <MarcaTangua variante="sobre-escuro" tamanho="sm" className="text-white" />
          <span>Feito por e para quem é de Tanguá.</span>
          <span className="text-white/60">© {new Date().getFullYear()} Tanguá App</span>
        </div>
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-7 gap-y-2.5">
          <Link href="/planos" className="underline-offset-4 hover:underline">Planos para negócios</Link>
          <Link href="/cadastrar?papel=profissional" className="underline-offset-4 hover:underline">Cadastrar meu negócio</Link>
          <Link href="/ajuda" className="underline-offset-4 hover:underline">Central de ajuda</Link>
          <Link href="/privacidade" className="underline-offset-4 hover:underline">Privacidade</Link>
          <Link href="/termos" className="underline-offset-4 hover:underline">Termos</Link>
        </nav>
      </div>
    </footer>
  )
}
