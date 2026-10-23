'use client'

import { useRef, useState } from 'react'
import { Loader2, UserMinus } from 'lucide-react'
import { adicionarMembro, removerMembro } from '@/lib/actions/equipe-actions'

type Membro = { perfil_id: string; papel: string; nome: string }

export function GerenciarEquipe({ membros, podeEditar }: { membros: Membro[]; podeEditar: boolean }) {
  const form = useRef<HTMLFormElement>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [removendo, setRemovendo] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4">
      {membros.length === 0 ? (
        <p className="text-sm text-barro-600">Só você cuida do negócio por enquanto.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {membros.map((m) => (
            <li key={m.perfil_id} className="flex items-center gap-3 rounded-[16px] bg-feira p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mata-100 font-bold text-mata-700">{m.nome.charAt(0).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-barro-900">{m.nome}</b>
                <span className="text-[13px] text-barro-600">{m.papel === 'gerente' ? 'Gerente' : 'Atendente'}</span>
              </span>
              {podeEditar && (
                <button
                  type="button"
                  disabled={removendo === m.perfil_id}
                  aria-label={`Tirar ${m.nome} da equipe`}
                  onClick={async () => {
                    if (!window.confirm(`Tirar ${m.nome} da equipe?`)) return
                    setRemovendo(m.perfil_id)
                    const r = await removerMembro(m.perfil_id)
                    setRemovendo(null)
                    if (r.erro) setErro(r.erro)
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-barro-600 hover:bg-red-50 hover:text-red-700"
                >
                  <UserMinus className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {podeEditar && (
        <form
          ref={form}
          action={async (dados) => {
            setEnviando(true)
            setErro(null)
            setOk(false)
            const r = await adicionarMembro(dados)
            setEnviando(false)
            if (r.erro) setErro(r.erro)
            else {
              setOk(true)
              form.current?.reset()
            }
          }}
          className="flex flex-col gap-2.5 border-t border-barro-100 pt-4"
        >
          <label htmlFor="email-membro" className="text-sm font-semibold text-barro-900">
            Adicionar pessoa pelo e-mail da conta dela
          </label>
          <input
            id="email-membro"
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="pessoa@email.com"
            className="h-12 rounded-[14px] border-[1.5px] border-barro-200 bg-superficie px-3.5 text-barro-900 focus:border-serra focus:outline-none"
          />
          <div className="flex flex-wrap gap-3 text-sm text-barro-900">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="papel" value="atendente" defaultChecked /> Atendente
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="papel" value="gerente" /> Gerente
            </label>
          </div>
          {erro && (
            <p role="alert" className="text-sm text-red-700">
              {erro}
            </p>
          )}
          {ok && (
            <p role="status" className="text-sm font-semibold text-mata-700">
              Pronto! A pessoa recebeu um aviso e já vê o painel.
            </p>
          )}
          <button disabled={enviando} className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-laranja font-bold text-tinta disabled:opacity-60">
            {enviando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Adicionar
          </button>
        </form>
      )}
    </div>
  )
}
