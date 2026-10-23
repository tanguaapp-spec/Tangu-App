'use client'

import { useState } from 'react'
import { Botao } from '@/components/ui/botao'
import { salvarPreferenciasComunicacao } from '@/lib/actions/conta-actions'
import { CATEGORIAS_OPCIONAIS } from '@/lib/notificacoes/categorias'

const OPCOES = Object.entries(CATEGORIAS_OPCIONAIS).map(([chave, rotulo]) => ({ chave, rotulo }))

export function PreferenciasComunicacao({
  preferencias,
  resumoDiario,
}: {
  preferencias: Record<string, boolean> | null
  resumoDiario: boolean
}) {
  const [estado, setEstado] = useState<'ocioso' | 'salvando' | 'salvo' | 'erro'>('ocioso')

  return (
    <form
      action={async (formData) => {
        setEstado('salvando')
        const r = await salvarPreferenciasComunicacao(formData)
        setEstado(r.erro ? 'erro' : 'salvo')
      }}
      className="space-y-3"
    >
      <fieldset className="space-y-2">
        <legend className="sr-only">Avisos que quero receber</legend>
        {OPCOES.map((o) => (
          <label key={o.chave} className="flex items-center gap-2 text-sm text-barro-800">
            <input type="checkbox" name={o.chave} defaultChecked={preferencias?.[o.chave] !== false} className="h-4 w-4 rounded border-barro-300" />
            {o.rotulo}
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm text-barro-800">
          <input type="checkbox" name="resumo_diario" defaultChecked={resumoDiario} className="h-4 w-4 rounded border-barro-300" />
          Resumo diário do meu bairro (no máximo 1 por dia)
        </label>
      </fieldset>
      <p className="text-xs text-barro-500">
        Avisos sobre sua própria conta (pagamento, suporte, moderação) sempre aparecem no app — eles não são propaganda.
      </p>
      <div className="flex items-center gap-3">
        <Botao type="submit" tamanho="sm" carregando={estado === 'salvando'}>
          Salvar preferências
        </Botao>
        {estado === 'salvo' && (
          <span role="status" className="text-sm text-mata-700">
            Salvo.
          </span>
        )}
        {estado === 'erro' && (
          <span role="alert" className="text-sm text-red-600">
            Não foi possível salvar.
          </span>
        )}
      </div>
    </form>
  )
}
