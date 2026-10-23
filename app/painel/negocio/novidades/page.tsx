import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { FormularioCriarPost } from '@/components/painel/formulario-criar-post'
import { ListaPosts } from '@/components/painel/lista-posts'
import { CartaoPainel, TituloPainel } from '@/components/painel/titulo-painel'

export const metadata: Metadata = { title: 'Novidades', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaNovidades() {
  const { negocio } = await exigirNegocio('/painel/negocio/novidades')
  const { data: posts } = await createClient()
    .from('posts_negocio')
    .select('id, titulo, tipo, ativo, criado_em, imagem_url')
    .eq('negocio_id', negocio.id)
    .neq('tipo', 'vaga_propria')
    .order('criado_em', { ascending: false })
    .limit(50)
  return (
    <>
      <TituloPainel titulo="Novidades" descricao="Chegou produto novo, mudou o horário, fez um trabalho bonito? Publique: aparece no seu perfil e na página inicial, e quem favoritou você recebe aviso." voltar="/painel/negocio/mais" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[380px_minmax(0,1fr)] md:items-start md:gap-6">
        <CartaoPainel titulo="Publicar">
          <FormularioCriarPost negocioId={negocio.id} />
        </CartaoPainel>
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-barro-900">Publicadas</h2>
          <ListaPosts posts={posts ?? []} />
        </section>
      </div>
    </>
  )
}
