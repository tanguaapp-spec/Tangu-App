import type { Metadata } from 'next'
import Link from 'next/link'
import { Award, Download, Gift } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { GuiaPagina } from '@/components/painel/admin/guia-pagina'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { alternarPremio, atualizarGanhador, premiarMorador, salvarPremio } from '@/lib/actions/premios-actions'
import { mesAtual, mesValido, nomeDoMes, rankingDoMes, ultimosMeses } from '@/lib/gamificacao/ranking'
import { seloPrincipal } from '@/lib/gamificacao/selos'
import { dataCurta } from '@/lib/datas'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Engajamento', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Premio = { id: string; titulo: string; descricao: string | null; parceiro: string | null; negocio_id: string | null; regra: string | null; quantidade: number | null; ativo: boolean }
type Ganhador = {
  id: string
  mes: string
  status: string
  observacao: string | null
  entregue_em: string | null
  premio: { titulo: string } | null
  perfil: { nome_completo: string } | null
}

const campo = 'h-11 w-full rounded-xl border border-barro-200 bg-superficie px-3 text-sm text-barro-900'
const STATUS: Record<string, string> = { a_entregar: 'A entregar', entregue: 'Entregue', cancelado: 'Cancelado' }

export default async function PaginaEngajamento({ searchParams }: { searchParams: { mes?: string; editar?: string } }) {
  const mes = mesValido(searchParams.mes) ? searchParams.mes! : mesAtual()
  const db = createServiceClient()
  const [ranking, { data: premiosBrutos, error: erroPremios }, { data: ganhadoresBrutos }, { data: negocios }] = await Promise.all([
    rankingDoMes(db, mes, 50),
    db.from('premios').select('*').order('ativo', { ascending: false }).order('ordem').order('criado_em', { ascending: false }),
    db
      .from('premios_ganhadores')
      .select('id, mes, status, observacao, entregue_em, premio:premios(titulo), perfil:perfis!premios_ganhadores_perfil_id_fkey(nome_completo)')
      .order('criado_em', { ascending: false })
      .limit(50),
    db.from('negocios').select('id, nome').eq('status_cadastro', 'aprovado').not('reivindicado_por', 'is', null).order('nome').limit(500),
  ])
  const semMigracao = ranking === null || !!erroPremios
  const premios = (premiosBrutos ?? []) as Premio[]
  const ativos = premios.filter((p) => p.ativo)
  const ganhadores = (ganhadoresBrutos ?? []) as unknown as Ganhador[]
  const emEdicao = premios.find((p) => p.id === searchParams.editar)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-barro-900">Engajamento</h1>
        <p className="text-barro-600">
          Quem mais participa do app em cada mês: Laranjas ganhas, vizinhos indicados (só os que confirmaram o e-mail), avaliações e favoritos. Use
          para escolher quem premiar com os prêmios dos parceiros.
        </p>
        <GuiaPagina chave="engajamento" />
      </header>

      {semMigracao && (
        <p role="alert" className="rounded-xl bg-casca-50 p-4 text-sm text-casca-900">
          Falta rodar a migration <b>0029_engajamento_e_premios.sql</b> no SQL Editor do Supabase. Sem ela, o ranking e os prêmios ficam vazios.
        </p>
      )}

      <section aria-labelledby="t-ranking" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="t-ranking" className="font-display text-xl font-bold capitalize text-barro-900">
            Ranking de {nomeDoMes(mes)}
          </h2>
          <a href={`/api/admin/engajamento.csv?mes=${mes}`} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-barro-200 bg-superficie px-3 text-sm font-semibold text-barro-900">
            <Download className="h-4 w-4" aria-hidden="true" /> Baixar planilha
          </a>
        </div>
        <nav aria-label="Mês" className="flex flex-wrap gap-2">
          {ultimosMeses(6).map((m) => (
            <Link
              key={m}
              href={`/painel/admin/engajamento?mes=${m}`}
              aria-current={m === mes ? 'page' : undefined}
              className={cn('flex h-10 items-center rounded-full px-3 text-sm font-semibold capitalize', m === mes ? 'bg-serra text-white' : 'border border-barro-200 bg-superficie text-barro-800')}
            >
              {nomeDoMes(m).replace(/ de \d{4}$/, '')}
            </Link>
          ))}
        </nav>

        {!ranking?.length ? (
          <p className="rounded-xl border border-dashed border-barro-200 p-4 text-sm text-barro-600">Ninguém ganhou Laranjas, avaliou ou favoritou neste mês ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-[20px] border border-barro-200/80 bg-superficie">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-barro-50 text-left text-xs uppercase tracking-wide text-barro-600">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Pessoa</th>
                  <th className="px-3 py-2 text-right">Laranjas no mês</th>
                  <th className="px-3 py-2 text-right">Indicações</th>
                  <th className="px-3 py-2 text-right">Avaliações</th>
                  <th className="px-3 py-2 text-right">Favoritos</th>
                  <th className="px-3 py-2 text-right">Saldo total</th>
                  <th className="px-3 py-2">Premiar</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((l, i) => {
                  const selo = seloPrincipal(l.avaliacoes, l.favoritos)
                  return (
                    <tr key={l.perfil_id} className="border-t border-barro-100 align-top">
                      <td className="px-3 py-2.5 font-mono font-bold text-casca-700">{i + 1}º</td>
                      <td className="px-3 py-2.5">
                        <b className="text-barro-900">{l.nome}</b>
                        <span className="block text-xs text-barro-600">
                          {l.bairro ?? 'bairro não informado'}
                          {selo ? ` · ${selo.rotulo}` : ''}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-barro-900">{l.laranjas}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">{l.indicacoes}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">{l.avaliacoes}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">{l.favoritos}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-barro-600">{l.saldo_total}</td>
                      <td className="px-3 py-2.5">
                        {ativos.length ? (
                          <FormularioAcao acao={premiarMorador} rotuloBotao="Dar prêmio" className="flex min-w-[200px] flex-col gap-1.5">
                            <input type="hidden" name="perfil_id" value={l.perfil_id} />
                            <input type="hidden" name="mes" value={mes} />
                            <select name="premio_id" required aria-label={`Prêmio para ${l.nome}`} className={campo} defaultValue="">
                              <option value="" disabled>
                                Escolha o prêmio
                              </option>
                              {ativos.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.titulo}
                                </option>
                              ))}
                            </select>
                          </FormularioAcao>
                        ) : (
                          <span className="text-xs text-barro-500">Cadastre um prêmio abaixo</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-barro-600">
          Admins e a equipe da plataforma ficam fora do ranking. Contas suspensas também. Empate: quem tem mais avaliações e indicações fica na
          frente.
        </p>
      </section>

      <section aria-labelledby="t-premios" className="flex flex-col gap-3">
        <h2 id="t-premios" className="flex items-center gap-2 font-display text-xl font-bold text-barro-900">
          <Gift className="h-5 w-5" aria-hidden="true" /> Prêmios dos parceiros
        </h2>
        <p className="text-sm text-barro-600">
          O que estiver visível aparece para os moradores na página <Link href="/premios" className="font-semibold text-mata-700 underline">Prêmios</Link>. Sem
          nenhum prêmio visível, a página mostra &quot;prêmios chegando em breve&quot;.
        </p>

        <div className="rounded-[20px] border border-barro-200/80 bg-superficie p-4">
          <h3 className="font-semibold text-barro-900">{emEdicao ? `Editar: ${emEdicao.titulo}` : 'Novo prêmio'}</h3>
          <FormularioAcao acao={salvarPremio} rotuloBotao={emEdicao ? 'Salvar alterações' : 'Cadastrar prêmio'} className="mt-3 flex flex-col gap-3">
            {emEdicao && <input type="hidden" name="id" value={emEdicao.id} />}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
                Prêmio
                <input name="titulo" required minLength={3} maxLength={120} defaultValue={emEdicao?.titulo} placeholder="Ex.: Corte de cabelo grátis" className={campo} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
                Como ganhar
                <input name="regra" maxLength={200} defaultValue={emEdicao?.regra ?? ''} placeholder="Ex.: 1º lugar do ranking do mês" className={campo} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
                Comércio parceiro no app (opcional)
                <select name="negocio_id" defaultValue={emEdicao?.negocio_id ?? ''} className={campo}>
                  <option value="">Nenhum (usar só o nome abaixo)</option>
                  {(negocios ?? []).map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
                Nome do parceiro
                <input name="parceiro" maxLength={120} defaultValue={emEdicao?.parceiro ?? ''} placeholder="Ex.: Barbearia do Zé" className={campo} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
                Quantos o parceiro oferece (opcional)
                <input name="quantidade" type="number" min={1} max={999} defaultValue={emEdicao?.quantidade ?? ''} className={campo} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
              Detalhes para o morador (opcional)
              <textarea
                name="descricao"
                maxLength={600}
                rows={3}
                defaultValue={emEdicao?.descricao ?? ''}
                placeholder="O que inclui, validade, onde retirar…"
                className="w-full rounded-xl border border-barro-200 bg-superficie px-3 py-2 text-sm text-barro-900"
              />
            </label>
          </FormularioAcao>
          {emEdicao && (
            <Link href="/painel/admin/engajamento" className="mt-2 inline-block text-sm font-semibold text-barro-700 underline">
              Cancelar edição
            </Link>
          )}
        </div>

        {premios.length > 0 && (
          <ul className="flex flex-col gap-2">
            {premios.map((p) => (
              <li key={p.id} className={cn('flex flex-wrap items-center gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-4', !p.ativo && 'opacity-70')}>
                <Award className="h-5 w-5 shrink-0 text-casca-700" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <b className="text-barro-900">{p.titulo}</b>
                  <p className="text-sm text-barro-600">
                    {[p.parceiro ?? (negocios ?? []).find((n) => n.id === p.negocio_id)?.nome, p.regra, p.quantidade ? `${p.quantidade} unidade(s)` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', p.ativo ? 'bg-mata-100 text-mata-900' : 'bg-barro-100 text-barro-800')}>
                  {p.ativo ? 'Visível' : 'Escondido'}
                </span>
                <Link href={`/painel/admin/engajamento?mes=${mes}&editar=${p.id}`} className="text-sm font-semibold text-mata-700 underline">
                  Editar
                </Link>
                <FormularioAcao acao={alternarPremio} rotuloBotao={p.ativo ? 'Esconder' : 'Mostrar'}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="ativo" value={p.ativo ? '0' : '1'} />
                </FormularioAcao>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="t-ganhadores" className="flex flex-col gap-3">
        <h2 id="t-ganhadores" className="font-display text-xl font-bold text-barro-900">
          Quem ganhou
        </h2>
        {ganhadores.length === 0 ? (
          <p className="text-sm text-barro-600">Ninguém foi premiado ainda. Quando der um prêmio no ranking, ele aparece aqui para acompanhar a entrega.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ganhadores.map((g) => (
              <li key={g.id} className="flex flex-col gap-2 rounded-[20px] border border-barro-200/80 bg-superficie p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 text-sm">
                  <b className="text-barro-900">{g.perfil?.nome_completo ?? 'conta apagada'}</b> · {g.premio?.titulo ?? 'prêmio removido'}
                  <p className="text-xs text-barro-600">
                    Ranking de {nomeDoMes(g.mes.slice(0, 7))} · {STATUS[g.status] ?? g.status}
                    {g.entregue_em ? ` em ${dataCurta(g.entregue_em)}` : ''}
                    {g.observacao ? ` · ${g.observacao}` : ''}
                  </p>
                </div>
                {g.status === 'a_entregar' && (
                  <FormularioAcao acao={atualizarGanhador} rotuloBotao="Salvar" className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={g.id} />
                    <select name="status" defaultValue="entregue" aria-label="Situação" className="h-10 rounded-xl border border-barro-200 bg-superficie px-2 text-sm">
                      <option value="entregue">Entregue</option>
                      <option value="cancelado">Cancelar</option>
                    </select>
                    <input name="observacao" maxLength={300} placeholder="Anotação (opcional)" aria-label="Anotação" className="h-10 rounded-xl border border-barro-200 bg-superficie px-2 text-sm" />
                  </FormularioAcao>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
