'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lightbulb } from 'lucide-react'
import { Campo, AreaTexto } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { abrirChamado } from '@/lib/actions/suporte-actions'
import { buscarArtigos } from '@/lib/ajuda/artigos'
import { CATEGORIAS_CHAMADO, type CategoriaChamado } from '@/lib/ajuda/chamados'

/**
 * Antes de enviar, sugere artigos que batem com o que a pessoa escreveu —
 * resposta automática só com conteúdo revisado, sem inventar nada.
 */
export function FormularioChamado({ categoriaInicial, paginaOrigem }: { categoriaInicial: CategoriaChamado; paginaOrigem?: string }) {
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  const sugestoes = useMemo(() => buscarArtigos(`${assunto} ${mensagem}`, 3), [assunto, mensagem])

  return (
    <form
      className="flex flex-col gap-4"
      action={async (formData) => {
        setCarregando(true)
        setErro(null)
        const r = await abrirChamado(formData)
        if (r.erro) {
          setErro(r.erro)
          setCarregando(false)
          return
        }
        router.push(`/ajuda/chamados/${r.chamadoId}?novo=1`)
      }}
    >
      {paginaOrigem && <input type="hidden" name="pagina" value={paginaOrigem} />}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="categoria" className="text-sm font-medium text-barro-800">
          Sobre o que é?
        </label>
        <select
          id="categoria"
          name="categoria"
          defaultValue={categoriaInicial}
          className="w-full rounded-xl border border-barro-300 bg-white px-4 py-2.5 text-barro-900 focus:border-casca-500 focus:ring-2 focus:ring-casca-100"
        >
          {Object.entries(CATEGORIAS_CHAMADO).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </div>
      <Campo id="assunto" name="assunto" rotulo="Assunto" maxLength={140} required value={assunto} onChange={(e) => setAssunto(e.target.value)} />
      <AreaTexto
        id="mensagem"
        name="mensagem"
        rotulo="Conte o que aconteceu"
        maxLength={4000}
        required
        placeholder="O que você tentou fazer, o que apareceu na tela…"
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
      />

      {sugestoes.length > 0 && (
        <aside aria-live="polite" className="rounded-xl bg-casca-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-barro-900">
            <Lightbulb className="h-4 w-4 text-casca-600" aria-hidden="true" /> Talvez isso resolva agora:
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {sugestoes.map((a) => (
              <li key={a.slug}>
                <Link href={`/ajuda/${a.slug}`} target="_blank" className="font-medium text-casca-800 underline">
                  {a.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}

      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      <p className="text-xs text-barro-500">Não envie senhas nem dados de cartão. A equipe nunca pede isso.</p>
      <Botao type="submit" carregando={carregando} className="self-start">
        Enviar chamado
      </Botao>
    </form>
  )
}
