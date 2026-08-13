'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Globe, Star, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { atualizarStatusProspeccao } from '@/lib/actions/prospeccao-actions'
import { linkWhatsapp } from '@/lib/utils'
import type { ProspeccaoNegocio } from '@/lib/types/database'

const OPCOES_STATUS = [
  { valor: 'novo', rotulo: 'Novo' },
  { valor: 'contactado', rotulo: 'Contactado' },
  { valor: 'convidado', rotulo: 'Convidado' },
  { valor: 'convertido', rotulo: 'Convertido' },
  { valor: 'ignorado', rotulo: 'Ignorado' },
]

export function LinhaProspeccao({ prospeccao }: { prospeccao: ProspeccaoNegocio }) {
  const router = useRouter()
  const [observacoes, setObservacoes] = useState(prospeccao.observacoes ?? '')
  const [salvando, setSalvando] = useState(false)

  async function mudarStatus(status: string) {
    setSalvando(true)
    await atualizarStatusProspeccao(prospeccao.id, status)
    setSalvando(false)
    router.refresh()
  }

  async function salvarObservacoes() {
    setSalvando(true)
    await atualizarStatusProspeccao(prospeccao.id, prospeccao.status, observacoes)
    setSalvando(false)
    router.refresh()
  }

  const mensagemConvite = `Olá! Aqui é da equipe do Tanguá App 🍊. Vi o "${prospeccao.nome}" no Google Maps e queria convidar vocês a criarem um perfil gratuito no nosso diretório de profissionais e comércios de Tanguá. Posso te contar mais?`

  return (
    <div className="rounded-casca border border-barro-100 bg-white p-4 shadow-feira">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-barro-900">{prospeccao.nome}</p>
            {prospeccao.negocio_vinculado_id && (
              <Link
                href={`/negocio/${prospeccao.negocio_vinculado_id}`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-full bg-mata-100 px-2 py-0.5 text-xs font-semibold text-mata-700 hover:underline"
              >
                <CheckCircle2 className="h-3 w-3" /> Já está no app
              </Link>
            )}
          </div>
          <p className="text-sm text-barro-500">
            {prospeccao.categoria_slug ?? 'sem categoria'} {prospeccao.bairro ? `· ${prospeccao.bairro}` : ''}
          </p>
          {prospeccao.endereco && <p className="text-xs text-barro-400">{prospeccao.endereco}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            {prospeccao.nota_google && (
              <span className="flex items-center gap-1 text-casca-600">
                <Star className="h-3.5 w-3.5 fill-current" /> {prospeccao.nota_google.toFixed(1)} (
                {prospeccao.total_avaliacoes_google ?? 0})
              </span>
            )}
            {prospeccao.telefone && (
              <a
                href={linkWhatsapp(prospeccao.telefone, mensagemConvite)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-medium text-mata-700 hover:underline"
              >
                <MessageCircle className="h-3.5 w-3.5" /> {prospeccao.telefone}
              </a>
            )}
            {prospeccao.site && (
              <a
                href={prospeccao.site}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-barro-600 hover:underline"
              >
                <Globe className="h-3.5 w-3.5" /> site
              </a>
            )}
          </div>
        </div>

        <select
          value={prospeccao.status}
          onChange={(e) => mudarStatus(e.target.value)}
          disabled={salvando}
          className="rounded-lg border border-barro-200 px-2 py-1.5 text-sm"
        >
          {OPCOES_STATUS.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Observações (ex: falei com o dono dia 12, disse que vai pensar)"
          className="flex-1 rounded-lg border border-barro-200 px-2.5 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={salvarObservacoes}
          disabled={salvando}
          className="rounded-lg border border-barro-200 px-3 py-1.5 text-sm text-barro-700 hover:bg-barro-50 disabled:opacity-50"
        >
          Salvar
        </button>
      </div>
    </div>
  )
}
