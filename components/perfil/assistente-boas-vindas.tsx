'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/botao'
import { salvarInteresses } from '@/lib/actions/perfil-actions'
import { cn } from '@/lib/utils'
import type { Categoria } from '@/lib/types/database'

export function AssistenteBoasVindas({ categorias, bairroAtual, iniciais = [] }: { categorias: Categoria[]; bairroAtual: string | null; iniciais?: string[] }) {
  const [escolhidas, setEscolhidas] = useState<string[]>(iniciais)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()

  function alternar(id: string) {
    setEscolhidas((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]))
  }

  return (
    <form
      action={async (formData) => {
        setCarregando(true)
        setErro(null)
        const r = await chamarAcao(salvarInteresses(formData))
        if (r.erro) {
          setErro(r.erro)
          setCarregando(false)
          return
        }
        router.push('/')
      }}
      className="space-y-6"
    >
      <fieldset>
        <legend className="font-semibold text-barro-900">O que você mais procura na cidade?</legend>
        <p className="text-sm text-barro-600">Escolha quantas quiser — dá pra mudar depois.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {categorias.filter((c) => !c.parent_id).map((c) => {
            const ativa = escolhidas.includes(c.id)
            return (
              <label
                key={c.id}
                className={cn(
                  'cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-casca-300',
                  ativa ? 'border-casca-500 bg-casca-50 text-casca-800' : 'border-barro-200 bg-superficie text-barro-700'
                )}
              >
                <input type="checkbox" name="categorias" value={c.id} checked={ativa} onChange={() => alternar(c.id)} className="sr-only" />
                {c.nome}
              </label>
            )
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="bairro" className="font-semibold text-barro-900">
          Seu bairro (opcional)
        </label>
        <p className="text-sm text-barro-600">Usado só pra te avisar do que acontece perto. Não aparece pra ninguém.</p>
        <input
          id="bairro"
          name="bairro"
          defaultValue={bairroAtual ?? ''}
          maxLength={100}
          placeholder="Centro, Duques, Vila Cortes…"
          className="mt-2 w-full max-w-sm rounded-xl border border-barro-300 bg-superficie px-4 py-2.5"
        />
      </div>

      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Botao type="submit" carregando={carregando}>
          Pronto, quero explorar
        </Botao>
        <Link href="/" className="text-sm font-medium text-barro-600 underline">
          Pular por agora
        </Link>
      </div>
    </form>
  )
}
