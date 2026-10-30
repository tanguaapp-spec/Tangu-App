import type { Metadata } from 'next'
import Link from 'next/link'
import { Award, Gift, Sparkles, Trophy } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { MOTIVOS_PONTOS, buscarSaldoLaranjas } from '@/lib/gamificacao/pontos'
import { calcularSelos } from '@/lib/gamificacao/selos'
import { mesAtual, nomeDoMes, rankingDoMes } from '@/lib/gamificacao/ranking'

export const metadata: Metadata = {
  title: 'Prêmios do Tanguá App',
  description: 'Ganhe Laranjas participando do app e concorra a prêmios de comércios e profissionais de Tanguá.',
}
export const dynamic = 'force-dynamic'

type Premio = { id: string; titulo: string; descricao: string | null; parceiro: string | null; regra: string | null; negocio: { nome: string; slug: string | null } | null }
type MeuPremio = { id: string; mes: string; status: string; premio: { titulo: string; parceiro: string | null } | null }

const TODOS_SELOS = calcularSelos(99, 99)

/** Página dos prêmios: o que dá para ganhar, como ganhar Laranjas e a posição da pessoa no mês. */
export default async function PaginaPremios() {
  const supabase = createClient()
  const mes = mesAtual()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const [{ data: premiosBrutos }, minha] = await Promise.all([
    supabase.from('premios').select('id, titulo, descricao, parceiro, regra, negocio:negocios(nome, slug)').eq('ativo', true).order('ordem').order('criado_em'),
    user ? minhaSituacao(user.id, mes) : Promise.resolve(null),
  ])
  const premios = (premiosBrutos ?? []) as unknown as Premio[]

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-10 pt-5 md:pt-10">
      <header className="flex flex-col gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-laranja text-tinta">
          <Trophy className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="font-display text-3xl font-bold text-barro-900 md:text-4xl">Prêmios para quem faz Tanguá acontecer</h1>
        <p className="text-barro-600">
          Cada avaliação, indicação e favorito ajuda a cidade a se conhecer melhor. Você ganha Laranjas por isso, e quem mais participa no mês
          concorre aos prêmios dos comércios e profissionais parceiros.
        </p>
      </header>

      {minha && (
        <section aria-label="Sua situação" className="grid grid-cols-3 gap-2 rounded-[22px] bg-mata-50 p-4 text-center text-mata-900">
          <div>
            <b className="block font-display text-2xl tabular-nums">{minha.saldo}</b>
            <span className="text-xs">Laranjas no total</span>
          </div>
          <div>
            <b className="block font-display text-2xl tabular-nums">{minha.doMes}</b>
            <span className="text-xs">Laranjas em {nomeDoMes(mes).replace(/ de \d{4}$/, '')}</span>
          </div>
          <div>
            <b className="block font-display text-2xl tabular-nums">{minha.posicao ? `${minha.posicao}º` : '—'}</b>
            <span className="text-xs">{minha.posicao ? 'lugar no ranking do mês' : 'ainda fora do ranking do mês'}</span>
          </div>
        </section>
      )}

      {minha && minha.ganhos.length > 0 && (
        <section aria-labelledby="t-meus" className="flex flex-col gap-2">
          <h2 id="t-meus" className="font-display text-xl font-bold text-barro-900">
            Seus prêmios
          </h2>
          <ul className="flex flex-col gap-2">
            {minha.ganhos.map((g) => (
              <li key={g.id} className="flex items-center gap-3 rounded-[18px] border border-casca-200 bg-casca-50 p-3 text-sm">
                <Gift className="h-5 w-5 shrink-0 text-casca-700" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <b className="text-barro-900">{g.premio?.titulo ?? 'Prêmio'}</b>
                  <span className="block text-barro-700">
                    {g.premio?.parceiro ? `${g.premio.parceiro} · ` : ''}
                    {nomeDoMes(g.mes.slice(0, 7))} · {g.status === 'entregue' ? 'entregue' : g.status === 'cancelado' ? 'cancelado' : 'a gente vai te chamar para combinar a entrega'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="t-premios" className="flex flex-col gap-3">
        <h2 id="t-premios" className="font-display text-xl font-bold text-barro-900">
          Prêmios
        </h2>
        {premios.length === 0 ? (
          <div className="flex flex-col gap-2 rounded-[22px] border border-dashed border-casca-300 bg-casca-50 p-5 text-casca-900">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
            <b className="font-display text-lg">Prêmios chegando em breve</b>
            <p className="text-sm">
              Estamos fechando parcerias com comércios e profissionais de Tanguá para premiar os moradores que mais participam. Suas Laranjas já
              estão contando: continue avaliando, indicando e favoritando.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {premios.map((p) => (
              <li key={p.id} className="flex flex-col gap-1.5 rounded-[22px] border border-barro-200/80 bg-superficie p-4">
                <Gift className="h-5 w-5 text-casca-700" aria-hidden="true" />
                <b className="text-barro-900">{p.titulo}</b>
                {(p.negocio || p.parceiro) && (
                  <span className="text-sm text-barro-700">
                    Oferecido por{' '}
                    {p.negocio?.slug ? (
                      <Link href={`/negocio/${p.negocio.slug}`} className="font-semibold text-mata-700 underline">
                        {p.parceiro || p.negocio.nome}
                      </Link>
                    ) : (
                      <b>{p.parceiro || p.negocio?.nome}</b>
                    )}
                  </span>
                )}
                {p.regra && <span className="w-fit rounded-full bg-casca-100 px-2.5 py-0.5 text-xs font-semibold text-casca-900">{p.regra}</span>}
                {p.descricao && <p className="text-sm text-barro-600">{p.descricao}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="t-como" className="flex flex-col gap-3">
        <h2 id="t-como" className="font-display text-xl font-bold text-barro-900">
          Como ganhar Laranjas
        </h2>
        <ul className="flex flex-col divide-y divide-barro-100 rounded-[22px] border border-barro-200/80 bg-superficie">
          {Object.values(MOTIVOS_PONTOS)
            .slice()
            .sort((a, b) => b.quantidade - a.quantidade)
            .map((m) => (
              <li key={m.rotulo} className="flex items-center justify-between gap-3 px-4 py-3">
                <span>
                  <b className="block text-sm text-barro-900">{m.rotulo}</b>
                  <span className="text-xs text-barro-600">{m.regra}</span>
                </span>
                <b className="shrink-0 font-mono text-lg text-casca-700">+{m.quantidade}</b>
              </li>
            ))}
        </ul>
        <p className="text-xs text-barro-600">Laranjas são pontos de reconhecimento do app e não valem dinheiro. O ranking recomeça todo dia 1º.</p>
      </section>

      <section aria-labelledby="t-selos" className="flex flex-col gap-3">
        <h2 id="t-selos" className="font-display text-xl font-bold text-barro-900">
          Selos
        </h2>
        <p className="text-sm text-barro-600">Seu selo aparece ao lado do seu nome nas avaliações, para a cidade saber que pode confiar na sua opinião.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {TODOS_SELOS.map((s) => (
            <li key={s.chave} className="flex items-start gap-2.5 rounded-xl bg-barro-50 p-3">
              <Award className="mt-0.5 h-4 w-4 shrink-0 text-casca-700" aria-hidden="true" />
              <span>
                <b className="block text-sm text-barro-900">{s.rotulo}</b>
                <span className="text-xs text-barro-600">{s.descricao}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {!user && (
        <div className="flex flex-wrap gap-2">
          <Link href="/cadastrar?origem=premios" className="inline-flex min-h-11 items-center rounded-xl bg-laranja px-5 font-bold text-tinta">
            Criar conta e começar a ganhar
          </Link>
          <Link href="/entrar?next=/premios" className="inline-flex min-h-11 items-center rounded-xl border border-barro-300 px-5 font-semibold text-barro-900">
            Já tenho conta
          </Link>
        </div>
      )}
    </div>
  )
}

async function minhaSituacao(perfilId: string, mes: string) {
  const db = createServiceClient()
  const [saldo, ranking, { data: ganhos }] = await Promise.all([
    buscarSaldoLaranjas(perfilId),
    rankingDoMes(db, mes, 1000),
    db.from('premios_ganhadores').select('id, mes, status, premio:premios(titulo, parceiro)').eq('perfil_id', perfilId).order('criado_em', { ascending: false }),
  ])
  const i = (ranking ?? []).findIndex((l) => l.perfil_id === perfilId)
  return {
    saldo,
    doMes: i >= 0 ? ranking![i].laranjas : 0,
    posicao: i >= 0 ? i + 1 : null,
    ganhos: (ganhos ?? []) as unknown as MeuPremio[],
  }
}
