import Link from 'next/link'
import { MapPin, MessageCircle, ShieldCheck } from 'lucide-react'
import { MarcaTangua } from '@/components/marca/logo-tangua'
import { linkWhatsapp } from '@/lib/utils'

const WHATSAPP_CONTATO = '21972652314'

export function Rodape() {
  return (
    <footer className="mt-20 bg-serra-escuro text-white/90">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 md:pb-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <MarcaTangua variante="sobre-escuro" className="text-white" />
            </div>
            <p className="mt-3 text-sm text-white/75">
              Tudo de Tanguá, perto de você. Feito por e para quem é daqui.
            </p>
            <p className="mt-4 flex items-start gap-2 text-sm text-white/80">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
              Perfis denunciados são revisados por uma pessoa da equipe. Viu algo
              estranho? Toque em &ldquo;Denunciar&rdquo; no perfil.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-laranja">
              Navegue
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-white/75">
              <li><Link href="/buscar" className="hover:text-white">Profissionais e comércios</Link></li>
              <li><Link href="/vagas" className="hover:text-white">Vagas de emprego</Link></li>
              <li><Link href="/mural" className="hover:text-white">Mural da cidade</Link></li>
              <li><Link href="/cadastrar?papel=profissional" className="hover:text-white">Cadastre seu negócio</Link></li>
              <li><Link href="/planos" className="hover:text-white">Planos para negócios</Link></li>
              <li><Link href="/orcamentos/novo" className="hover:text-white">Pedir orçamento</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-laranja">
              Legal
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-white/75">
              <li><Link href="/privacidade" className="hover:text-white">Política de Privacidade</Link></li>
              <li><Link href="/termos" className="hover:text-white">Termos de Uso</Link></li>
              <li><Link href="/ajuda" className="hover:text-white">Central de ajuda</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-laranja">
              Tanguá, RJ
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-white/75">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-laranja" />
                Região Metropolitana do Rio
              </li>
              <li>
                <a
                  href={linkWhatsapp(WHATSAPP_CONTATO, 'Olá! Tenho uma dúvida sobre o Tanguá App.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white"
                >
                  <MessageCircle className="h-4 w-4 text-laranja" />
                  Fale com a gente no WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/60">
          © {new Date().getFullYear()} Tanguá App. Feito por gente de Tanguá, para Tanguá.
        </div>
      </div>
    </footer>
  )
}
