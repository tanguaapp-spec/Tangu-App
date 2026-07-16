import { buscarNegocioPorId } from '@/lib/queries/negocios'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import {
  MapPin,
  MessageCircle,
  Instagram,
  Globe,
  Star,
  Clock,
  Store,
} from 'lucide-react'
import { SeloVerificado, Selo } from '@/components/ui/selo'
import { linkWhatsapp } from '@/lib/utils'
import { BotaoReivindicar } from '@/components/negocio/botao-reivindicar'

const diasSemana: Record<string, string> = {
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
  dom: 'Domingo',
}

export default async function PaginaNegocio({ params }: { params: { id: string } }) {
  const negocio = await buscarNegocioPorId(params.id)
  if (!negocio) notFound()

  const supabase = createClient()
  const { data: avaliacoes } = await supabase
    .from('avaliacoes')
    .select('*, autor:perfis(nome_completo, avatar_url)')
    .eq('negocio_id', params.id)
    .order('criado_em', { ascending: false })

  const { data: posts } = await supabase
    .from('posts_negocio')
    .select('*')
    .eq('negocio_id', params.id)
    .eq('ativo', true)
    .order('criado_em', { ascending: false })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="relative h-56 w-full overflow-hidden rounded-casca bg-barro-100 sm:h-72">
        {negocio.foto_capa_url ? (
          <Image src={negocio.foto_capa_url} alt={negocio.nome} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-barro-300">
            <Store className="h-16 w-16" />
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-8 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-semibold text-barro-900">{negocio.nome}</h1>
            {negocio.verificado && <SeloVerificado />}
          </div>

          {negocio.categoria && <Selo tom="laranja" className="mt-2">{negocio.categoria.nome}</Selo>}

          {negocio.descricao && <p className="mt-4 text-barro-700">{negocio.descricao}</p>}

          <div className="mt-5 flex flex-col gap-2 text-barro-700">
            {negocio.endereco && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-barro-400" /> {negocio.endereco}
              </span>
            )}
            {negocio.nota_google && (
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-casca-400 text-casca-400" />
                {negocio.nota_google.toFixed(1)} no Google ({negocio.total_avaliacoes_google} avaliações)
              </span>
            )}
          </div>

          {negocio.horario_funcionamento && (
            <div className="mt-5">
              <h3 className="flex items-center gap-2 font-semibold text-barro-800">
                <Clock className="h-4 w-4" /> Horário de funcionamento
              </h3>
              <ul className="mt-2 grid grid-cols-2 gap-1 text-sm text-barro-600 sm:grid-cols-3">
                {Object.entries(negocio.horario_funcionamento).map(([dia, horario]) => (
                  <li key={dia}>
                    <span className="font-medium">{diasSemana[dia] ?? dia}:</span> {horario as string}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Posts/novidades do profissional */}
          {posts && posts.length > 0 && (
            <div className="mt-8">
              <h3 className="font-display text-xl font-semibold text-barro-900">Novidades</h3>
              <div className="mt-3 space-y-3">
                {posts.map((post) => (
                  <div key={post.id} className="rounded-xl border border-barro-100 bg-white p-4">
                    <Selo tom={post.tipo === 'promocao' ? 'laranja' : 'verde'}>
                      {post.tipo === 'promocao' ? 'Promoção' : post.tipo === 'vaga_propria' ? 'Vaga' : 'Novidade'}
                    </Selo>
                    <h4 className="mt-2 font-semibold text-barro-900">{post.titulo}</h4>
                    {post.conteudo && <p className="mt-1 text-sm text-barro-600">{post.conteudo}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Avaliações */}
          <div className="mt-8">
            <h3 className="font-display text-xl font-semibold text-barro-900">
              Avaliações da comunidade
            </h3>
            {!avaliacoes || avaliacoes.length === 0 ? (
              <p className="mt-2 text-barro-500">Seja o primeiro a avaliar este negócio.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {avaliacoes.map((av: any) => (
                  <div key={av.id} className="rounded-xl border border-barro-100 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-barro-800">{av.autor?.nome_completo}</span>
                      <span className="flex items-center gap-1 text-casca-500">
                        {Array.from({ length: av.nota }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </span>
                    </div>
                    {av.comentario && <p className="mt-1.5 text-sm text-barro-600">{av.comentario}</p>}
                    {av.resposta_profissional && (
                      <div className="mt-2 rounded-lg bg-barro-50 p-2.5 text-sm text-barro-700">
                        <span className="font-semibold">Resposta do profissional:</span> {av.resposta_profissional}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar de contato */}
        <aside className="space-y-3">
          <div className="rounded-casca border border-barro-100 bg-white p-5 shadow-feira">
            {negocio.whatsapp && (
              <a
                href={linkWhatsapp(negocio.whatsapp, `Olá! Vi seu perfil no Tanguá App.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-mata-500 py-3 font-semibold text-white transition-colors hover:bg-mata-600"
              >
                <MessageCircle className="h-5 w-5" /> Chamar no WhatsApp
              </a>
            )}
            <div className="mt-3 flex flex-col gap-2 text-sm">
              {negocio.instagram && (
                <a
                  href={`https://instagram.com/${negocio.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-barro-700 hover:text-casca-600"
                >
                  <Instagram className="h-4 w-4" /> @{negocio.instagram.replace('@', '')}
                </a>
              )}
              {negocio.site && (
                <a
                  href={negocio.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-barro-700 hover:text-casca-600"
                >
                  <Globe className="h-4 w-4" /> Site oficial
                </a>
              )}
            </div>
          </div>

          {!negocio.reivindicado_por && <BotaoReivindicar negocioId={negocio.id} />}
        </aside>
      </div>
    </div>
  )
}
