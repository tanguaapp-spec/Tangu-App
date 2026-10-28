'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useState } from 'react'
import Link from 'next/link'
import { Download, Trash2 } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { excluirConta } from '@/lib/actions/conta-actions'

export function PrivacidadeDados({ temNegocio }: { temNegocio: boolean }) {
  const [abrindo, setAbrindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  return (
    <div className="space-y-4">
      <div>
        <a href="/api/conta/exportar" className="inline-flex items-center gap-2 rounded-lg border border-barro-300 px-3 py-1.5 text-sm font-semibold text-barro-800 hover:bg-barro-50">
          <Download className="h-4 w-4" aria-hidden="true" /> Baixar meus dados (JSON)
        </a>
        <p className="mt-1 text-xs text-barro-500">
          Perfil, avaliações, favoritos, negócio, chamados e notificações. Veja a{' '}
          <Link href="/privacidade" className="underline">
            política de privacidade
          </Link>
          .
        </p>
      </div>

      {!abrindo ? (
        <button type="button" onClick={() => setAbrindo(true)} className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:underline">
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Excluir minha conta
        </button>
      ) : (
        <form
          action={async (formData) => {
            setCarregando(true)
            setErro(null)
            const r = await chamarAcao(excluirConta(formData))
            // em caso de sucesso a action redireciona
            if (r?.erro) {
              setErro(r.erro)
              setCarregando(false)
            }
          }}
          className="rounded-xl border border-red-200 bg-red-50 p-4"
          aria-labelledby="titulo-excluir"
        >
          <p id="titulo-excluir" className="font-semibold text-red-800">
            Excluir a conta é definitivo
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">
            <li>Seu perfil, avaliações, favoritos, chamados e notificações são apagados.</li>
            {temNegocio && <li>Seu negócio sai do ar, as fotos são apagadas e a assinatura (se houver) é cancelada.</li>}
            <li>Registros de pagamento podem ser mantidos pelo prazo legal, sem ligação com seu nome.</li>
          </ul>
          <label htmlFor="senha-exclusao" className="mt-3 block text-sm font-medium text-red-900">
            Sua senha
          </label>
          <input id="senha-exclusao" name="senha" type="password" required autoComplete="current-password" className="mt-1 w-full max-w-xs rounded-lg border border-red-300 px-3 py-1.5" />
          <label htmlFor="confirmacao-exclusao" className="mt-3 block text-sm font-medium text-red-900">
            Digite EXCLUIR
          </label>
          <input id="confirmacao-exclusao" name="confirmacao" required autoComplete="off" className="mt-1 w-full max-w-xs rounded-lg border border-red-300 px-3 py-1.5" />
          {erro && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {erro}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Botao type="submit" variante="perigo" tamanho="sm" carregando={carregando}>
              Excluir definitivamente
            </Botao>
            <Botao type="button" variante="fantasma" tamanho="sm" onClick={() => setAbrindo(false)}>
              Cancelar
            </Botao>
          </div>
        </form>
      )}
    </div>
  )
}
