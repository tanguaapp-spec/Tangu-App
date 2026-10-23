import type { Metadata } from 'next'
import Link from 'next/link'
import { Printer, Gift } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { CartaoDivulgacao } from '@/components/painel/cartao-divulgacao'
import { CartaoDestaque } from '@/components/painel/cartao-destaque'
import { BotaoCopiarLink } from '@/components/painel/botao-copiar-link'
import { CartaoPainel, TituloPainel } from '@/components/painel/titulo-painel'
import { urlDoSite } from '@/lib/site'
import { urlNegocio } from '@/lib/ui/apresentacao'

export const metadata: Metadata = { title: 'Divulgar', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaDivulgar() {
  const { user, negocio } = await exigirNegocio('/painel/negocio/divulgar')
  const site = urlDoSite()
  // ?origem=qr: o QR impresso conta como origem "QR" nas estatísticas
  const urlPublica = `${site}${urlNegocio(negocio)}`
  const urlQr = `${urlPublica}?origem=qr`
  const [{ data: perfil }, { data: config }] = await Promise.all([
    createClient().rpc('meu_perfil').maybeSingle<{ codigo_convite: string | null }>(),
    createServiceClient().from('configuracoes_sistema').select('valor').eq('chave', 'dias_bonus_indicacao').maybeSingle(),
  ])
  const diasBonus = Number(config?.valor ?? 0)
  const convite = perfil?.codigo_convite ? `${site}/cadastrar?papel=profissional&convite=${perfil.codigo_convite}` : null
  void user

  return (
    <>
      <TituloPainel titulo="Divulgar" descricao="Leve quem já é seu cliente pro seu perfil: lá ele favorita e passa a receber suas ofertas." voltar="/painel/negocio/mais" />
      <div className="flex flex-col gap-4">
        <CartaoDivulgacao urlPublica={urlQr} nomeNegocio={negocio.nome} />
        <CartaoPainel titulo="Cartaz pro balcão e vitrine" descricao="Folha A4 com seu QR code, pronta pra imprimir. Quem aponta a câmera cai direto no seu perfil.">
          <Link href="/painel/negocio/divulgar/cartaz" className="inline-flex h-12 items-center gap-2 rounded-[14px] bg-serra px-5 font-bold text-white">
            <Printer className="h-4 w-4" aria-hidden="true" /> Abrir cartaz pra imprimir
          </Link>
        </CartaoPainel>
        {convite && (
          <CartaoPainel
            titulo="Indique outro negócio"
            descricao={
              diasBonus > 0
                ? `Quando um negócio que você indicou se cadastrar por este link, você ganha ${diasBonus} dias do plano Profissional grátis.`
                : 'Mande este link pra outros comércios e profissionais da cidade.'
            }
          >
            <div className="flex flex-col gap-2.5">
              <div className="break-all rounded-[14px] bg-feira px-3 py-2.5 font-mono text-sm text-barro-800">{convite}</div>
              <div className="flex flex-wrap gap-2">
                <BotaoCopiarLink texto={convite} />
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Coloca teu negócio no Tanguá App! É grátis e o pessoal da cidade encontra a gente direto pelo WhatsApp: ${convite}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-laranja px-4 text-sm font-bold text-tinta"
                >
                  <Gift className="h-4 w-4" aria-hidden="true" /> Mandar no WhatsApp
                </a>
              </div>
            </div>
          </CartaoPainel>
        )}
        <CartaoDestaque destaqueAtivo={negocio.destaque_ativo} destaqueExpiraEm={negocio.destaque_expira_em} />
      </div>
    </>
  )
}
