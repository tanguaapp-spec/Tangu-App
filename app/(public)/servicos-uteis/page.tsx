import type { Metadata } from 'next'
import { MapPin, MessageCircle, Phone } from 'lucide-react'
import { createPublicClient } from '@/lib/supabase/server'
import { exigirModulo } from '@/lib/config/ler'

export const metadata: Metadata = {
  title: 'Serviços úteis de Tanguá',
  description: 'Telefones de emergência, farmácia de plantão, saúde, Prefeitura, coleta de lixo e transporte em Tanguá.',
  alternates: { canonical: '/servicos-uteis' },
}
export const revalidate = 600

const GRUPOS = [
  ['farmacia_plantao', 'Farmácia de plantão'],
  ['emergencia', 'Emergência'],
  ['saude', 'Saúde'],
  ['prefeitura', 'Prefeitura e serviços públicos'],
  ['coleta', 'Coleta de lixo'],
  ['transporte', 'Transporte'],
  ['outros', 'Outros'],
] as const

type Servico = {
  id: string
  categoria: string
  nome: string
  telefone: string | null
  whatsapp: string | null
  endereco: string | null
  horario: string | null
  observacao: string | null
  plantao_inicio: string | null
  plantao_fim: string | null
}

export default async function PaginaServicosUteis() {
  await exigirModulo('servicos_uteis')
  const { data } = await createPublicClient().from('servicos_uteis').select('*').eq('ativo', true).order('ordem').order('nome')
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  // farmácia de plantão só aparece no período dela
  const servicos = ((data ?? []) as Servico[]).filter(
    (s) => s.categoria !== 'farmacia_plantao' || ((!s.plantao_inicio || s.plantao_inicio <= hoje) && (!s.plantao_fim || s.plantao_fim >= hoje))
  )

  return (
    <div className="mx-auto max-w-3xl px-5 pb-8 pt-5 md:px-6 md:pt-10">
      <h1 className="font-display text-2xl font-bold text-barro-900 md:text-[32px]">Serviços úteis</h1>
      <p className="mt-1 text-sm text-barro-600 md:text-base">Toque no número para ligar. Em emergência, ligue direto: 192 (SAMU), 193 (Bombeiros), 190 (Polícia).</p>

      <div className="mt-6 flex flex-col gap-7">
        {GRUPOS.map(([cat, titulo]) => {
          const itens = servicos.filter((s) => s.categoria === cat)
          if (!itens.length) return null
          return (
            <section key={cat} aria-label={titulo} className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-bold text-barro-900">{titulo}</h2>
              {itens.map((s) => (
                <article key={s.id} className="flex flex-col gap-2 rounded-[22px] border border-barro-200/80 bg-superficie p-4">
                  <b className="text-barro-900">{s.nome}</b>
                  {s.observacao && <p className="text-sm text-barro-700">{s.observacao}</p>}
                  {(s.endereco || s.horario) && (
                    <p className="flex items-start gap-1.5 text-sm text-barro-600">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {[s.endereco, s.horario].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {s.telefone && (
                      <a href={`tel:${s.telefone.replace(/[^\d+]/g, '')}`} className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-serra px-4 font-bold text-white">
                        <Phone className="h-4 w-4" aria-hidden="true" /> {s.telefone}
                      </a>
                    )}
                    {s.whatsapp && (
                      <a
                        href={`https://wa.me/55${s.whatsapp.replace(/^55/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border-[1.5px] border-barro-200 px-4 font-semibold text-barro-900"
                      >
                        <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}
