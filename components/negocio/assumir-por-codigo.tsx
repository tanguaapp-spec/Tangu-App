'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KeyRound, MessageCircle } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { chamarAcao } from '@/lib/ui/chamar-acao'
import { confirmarCodigoReivindicacao, pedirCodigoReivindicacao } from '@/lib/actions/reivindicacao-codigo-actions'

/**
 * "Sou o dono": pede um código que chega no WhatsApp já cadastrado no
 * comércio; digitando o código, o perfil passa pra pessoa na hora.
 */
export function AssumirPorCodigo({ negocioId, logado, voltarPara }: { negocioId: string; logado: boolean; voltarPara: string }) {
  const [etapa, setEtapa] = useState<'inicio' | 'codigo'>('inicio')
  const [destino, setDestino] = useState<string | null>(null)
  const [codigo, setCodigo] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()

  if (!logado) {
    return (
      <Link
        href={`/entrar?next=${encodeURIComponent(`${voltarPara}#reivindicar`)}`}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-laranja px-5 font-bold text-tinta"
      >
        <KeyRound className="h-5 w-5" aria-hidden="true" /> Sou o dono: entrar para assumir
      </Link>
    )
  }

  if (etapa === 'inicio') {
    return (
      <div className="flex flex-col gap-2">
        <Botao
          carregando={carregando}
          onClick={async () => {
            setCarregando(true)
            setErro(null)
            const r = await chamarAcao(pedirCodigoReivindicacao(negocioId))
            setCarregando(false)
            if (r.erro) setErro(r.erro)
            else {
              setDestino(('destino' in r && r.destino) || null)
              setEtapa('codigo')
            }
          }}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" /> Sou o dono: receber código no WhatsApp
        </Botao>
        {erro && (
          <p role="alert" className="text-sm text-red-700">
            {erro}
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        setCarregando(true)
        setErro(null)
        const r = await chamarAcao(confirmarCodigoReivindicacao(negocioId, codigo))
        setCarregando(false)
        if (r.erro) setErro(r.erro)
        else router.push('/painel/negocio')
      }}
    >
      <p className="text-sm text-barro-800">
        Pronto! O código vai chegar no WhatsApp <b>{destino ?? 'cadastrado no perfil'}</b> em alguns minutos. Quando chegar, digite aqui:
      </p>
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        aria-label="Código de 6 números"
        className="h-14 w-full max-w-[220px] rounded-2xl border border-barro-200 bg-superficie text-center font-mono text-2xl tracking-[0.4em]"
      />
      <Botao type="submit" carregando={carregando} disabled={codigo.length !== 6} className="self-start">
        Confirmar e assumir o perfil
      </Botao>
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
      <p className="text-xs text-barro-600">Pode fechar esta página: quando o código chegar, volte aqui e toque de novo em “Sou o dono”.</p>
    </form>
  )
}
