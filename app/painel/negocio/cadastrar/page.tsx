import { createClient } from '@/lib/supabase/server'
import { buscarCategorias } from '@/lib/queries/negocios'
import { FormularioCadastrarNegocio } from '@/components/painel/formulario-cadastrar-negocio'
import { redirect } from 'next/navigation'
import { Store } from 'lucide-react'

export default async function CadastrarNegocioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  const { data: existente } = await supabase
    .from('negocios')
    .select('id')
    .eq('reivindicado_por', user.id)
    .maybeSingle()

  if (existente) redirect('/painel/negocio')

  const categorias = await buscarCategorias()

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-casca-100 text-casca-600">
          <Store className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-medium text-barro-900">Cadastrar meu negócio</h1>
          <p className="text-barro-600">Tem um estabelecimento ou atua como autônomo? Apareça no diretório de Tanguá.</p>
        </div>
      </div>

      <div className="mt-6 rounded-casca border border-barro-100 bg-white p-6 shadow-feira">
        <FormularioCadastrarNegocio categorias={categorias as any} />
      </div>
    </div>
  )
}
