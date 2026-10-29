import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { decidirPedidoOcultar } from '@/lib/actions/importacao-actions'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { FormularioImportar } from '@/components/painel/admin/formulario-importar'
import { GuiaPagina } from '@/components/painel/admin/guia-pagina'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Importar comércios', robots: { index: false } }

export default async function PaginaImportar() {
  const db = createServiceClient()
  const [{ count: naoReivindicados }, { count: importados }, { data: pedidos }] = await Promise.all([
    db.from('negocios').select('id', { count: 'exact', head: true }).is('reivindicado_por', null).eq('ativo', true),
    db.from('negocios').select('id', { count: 'exact', head: true }).not('import_ref', 'is', null),
    db.from('pedidos_ocultar').select('id, nome, contato, motivo, criado_em, negocio:negocios(nome, slug)').eq('status', 'aberto').order('criado_em'),
  ])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Importar comércios</h1>
        <p className="mt-1 text-barro-600">
          Suba a lista de comércios da cidade (o arquivo JSON do BoraAli ou um CSV). Eles entram como perfis{' '}
          <b>não reivindicados</b>: só nome, categoria, endereço, bairro, telefone e horário. No perfil aparece um aviso explicando
          que foi o Tanguá App que criou para facilitar, com botões para o dono assumir de graça ou pedir para ocultar.
        </p>
        <GuiaPagina chave="importar" />
        <p className="mt-2 text-sm text-barro-600">
          Hoje: {naoReivindicados ?? 0} perfis sem dono no ar · {importados ?? 0} vieram de lista. Para chamar os donos, use{' '}
          <Link href="/painel/admin/leads?lista=nao_reivindicado" className="font-semibold text-mata-700 underline">
            Leads → Ainda não reivindicados
          </Link>
          .
        </p>
      </header>

      <section className="rounded-casca border border-barro-100 bg-superficie p-5">
        <FormularioImportar />
        <p className="mt-4 text-xs text-barro-500">
          Regras: igrejas, caixas eletrônicos e ONGs ficam de fora; órgãos públicos viram Serviços úteis. Reimportar a mesma lista atualiza
          em vez de duplicar, e perfil que o dono já assumiu nunca é alterado.
        </p>
      </section>

      <section id="ocultar" aria-labelledby="titulo-ocultar" className="flex scroll-mt-20 flex-col gap-3">
        <h2 id="titulo-ocultar" className="font-display text-2xl font-semibold text-barro-900">
          Pedidos para ocultar ({(pedidos ?? []).length})
        </h2>
        <p className="text-sm text-barro-600">Donos que preferem não aparecer. Combinado com eles: a gente oculta. Se possível, confirme pelo contato antes.</p>
        {(pedidos ?? []).length === 0 && <p className="text-barro-600">Nenhum pedido aberto.</p>}
        {(pedidos ?? []).map((p) => {
          const n = p.negocio as unknown as { nome: string; slug: string | null } | null
          return (
            <article key={p.id} className="flex flex-col gap-2 rounded-casca border border-barro-100 bg-superficie p-5">
              <b className="text-barro-900">
                {n?.nome ?? 'Perfil removido'}{' '}
                {n?.slug && (
                  <Link href={`/negocio/${n.slug}`} target="_blank" className="text-sm font-normal text-mata-700 underline">
                    ver perfil
                  </Link>
                )}
              </b>
              <p className="text-sm text-barro-700">
                Pedido por {p.nome} · contato: {p.contato}
              </p>
              {p.motivo && <p className="text-sm text-barro-600">“{p.motivo}”</p>}
              <div className="flex flex-wrap gap-3">
                <FormularioAcao acao={decidirPedidoOcultar} rotuloBotao="Ocultar perfil">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="decisao" value="ocultar" />
                </FormularioAcao>
                <FormularioAcao acao={decidirPedidoOcultar} rotuloBotao="Manter no ar">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="decisao" value="manter" />
                </FormularioAcao>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
