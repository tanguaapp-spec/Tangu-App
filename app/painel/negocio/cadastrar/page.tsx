import { createClient } from '@/lib/supabase/server'
import { lerConfig } from '@/lib/config/ler'
import { buscarCategorias } from '@/lib/queries/negocios'
import { FormularioCadastrarNegocio } from '@/components/painel/formulario-cadastrar-negocio'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Store } from 'lucide-react'

export default async function CadastrarNegocioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar?next=/painel/negocio/cadastrar')

  // vários negócios por conta, até o limite do admin
  const [{ count: jaTem }, maximo] = await Promise.all([
    supabase.from('negocios').select('id', { count: 'exact', head: true }).eq('reivindicado_por', user.id),
    lerConfig('max_negocios_por_dono'),
  ])
  if ((jaTem ?? 0) >= Number(maximo)) redirect('/painel/negocio')
  const outro = (jaTem ?? 0) > 0

  const categorias = await buscarCategorias()

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/painel/negocio"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-barro-600 transition-colors hover:text-casca-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-casca-100 text-casca-600">
          <Store className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-medium text-barro-900">{outro ? 'Cadastrar outro negócio' : 'Cadastrar meu negócio'}</h1>
          <p className="text-barro-600">
            {outro
              ? 'Ele fica separado do outro, com perfil, catálogo e plano próprios. Você troca entre eles em "Meus negócios" no painel.'
              : 'Tem um estabelecimento ou atua como autônomo? Apareça no diretório de Tanguá.'}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-casca border border-barro-100 bg-superficie p-6 shadow-feira">
        <FormularioCadastrarNegocio categorias={categorias as any} />
      </div>
    </div>
  )
}
