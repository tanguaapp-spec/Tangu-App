
import { buscarFavoritosUsuario } from '@/lib/queries/negocios'
import { CardNegocio } from '@/components/negocio/card-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Heart } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PaginaFavoritos() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/entrar')
  }

  const favoritos = await buscarFavoritosUsuario()

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="h-10 w-10 text-casca-500" />
        <div>
          <h1 className="text-3xl font-display font-semibold text-barro-900">
            Meus favoritos
          </h1>
          <p className="text-barro-600">
            {favoritos.length} {favoritos.length === 1 ? 'negócio' : 'negócios'} salvos
          </p>
        </div>
      </div>

      {favoritos.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="mx-auto h-16 w-16 text-barro-300 mb-4" />
          <p className="text-lg text-barro-600">Você ainda não tem favoritos.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {favoritos.map((negocio, i) => (
            <CardNegocio key={negocio.id} negocio={negocio} indice={i} />
          ))}
        </div>
      )}
    </div>
  )
}
