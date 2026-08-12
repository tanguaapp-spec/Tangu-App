import Link from 'next/link'
import { MapPin, Mail, ShieldCheck } from 'lucide-react'

export function Rodape() {
  return (
    <footer className="mt-20 border-t border-barro-100 bg-barro-900 text-barro-100">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-casca-500 text-white font-display font-bold">
                T
              </span>
              <span className="font-display text-lg font-semibold text-white">Tanguá App</span>
            </div>
            <p className="mt-3 text-sm text-barro-300">
              A cidade da laranja, conectada. Encontre quem faz Tanguá funcionar.
            </p>
            <p className="mt-4 flex items-start gap-2 text-sm text-mata-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mata-400" />
              Todo negócio passa por checagem da nossa equipe antes de aparecer aqui —
              nada de perfil fake.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-casca-400">
              Navegue
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-barro-300">
              <li><Link href="/buscar" className="hover:text-white">Profissionais e comércios</Link></li>
              <li><Link href="/vagas" className="hover:text-white">Vagas de emprego</Link></li>
              <li><Link href="/mural" className="hover:text-white">Mural da cidade</Link></li>
              <li><Link href="/cadastrar?papel=profissional" className="hover:text-white">Cadastre seu negócio</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-casca-400">
              Tanguá, RJ
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-barro-300">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-casca-400" />
                Região Metropolitana do Rio
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-casca-400" />
                contato@tangua.app
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-barro-800 pt-6 text-xs text-barro-400">
          © {new Date().getFullYear()} Tanguá App. Feito por gente de Tanguá, para Tanguá.
        </div>
      </div>
    </footer>
  )
}
