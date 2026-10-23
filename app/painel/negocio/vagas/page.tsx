import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { FormularioCriarVagaPropria } from '@/components/painel/formulario-criar-vaga-propria'
import { BotaoEncerrarVaga } from '@/components/painel/botao-encerrar-vaga'
import { CartaoPainel, TituloPainel } from '@/components/painel/titulo-painel'

export const metadata: Metadata = { title: 'Vagas', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaVagasPainel() {
  const { negocio } = await exigirNegocio('/painel/negocio/vagas')
  const { data: vagas } = await createClient().from('vagas').select('*').eq('negocio_id', negocio.id).order('criado_em', { ascending: false })
  return (
    <>
      <TituloPainel titulo="Vagas" descricao="Está contratando? A vaga vai pro mural de vagas da cidade, com o nome do seu negócio." voltar="/painel/negocio/mais" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_400px] md:items-start md:gap-6">
        <CartaoPainel titulo="Suas vagas">
          {!vagas?.length ? (
            <p className="text-sm text-barro-600">Nenhuma vaga publicada.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {vagas.map((v) => (
                <li key={v.id} className="flex items-center gap-3 rounded-[16px] bg-feira p-3">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-barro-900">{v.titulo}</b>
                    <span className="text-[13px] text-barro-600">{v.status === 'aberta' ? 'Aberta' : v.status === 'pausada' ? 'Pausada' : 'Encerrada'}</span>
                  </span>
                  {v.status === 'aberta' && <BotaoEncerrarVaga vagaId={v.id} origem="propria" />}
                </li>
              ))}
            </ul>
          )}
        </CartaoPainel>
        <CartaoPainel titulo="Nova vaga">
          <FormularioCriarVagaPropria negocioId={negocio.id} />
        </CartaoPainel>
      </div>
    </>
  )
}
