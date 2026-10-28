'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ChevronsUpDown, Loader2, Plus, Store } from 'lucide-react'
import { useFormStatus } from 'react-dom'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { cn } from '@/lib/utils'

type Opcao = { id: string; nome: string; papel: 'dono' | 'gerente' | 'atendente' }

const ROTULO_PAPEL = { dono: 'Dono', gerente: 'Gerente', atendente: 'Atendente' } as const

function BotaoOpcao({ opcao, atual }: { opcao: Opcao; atual: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      name="negocio_id"
      value={opcao.id}
      disabled={pending}
      className={cn(
        'flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-4 text-left',
        atual ? 'border-mata-700 bg-mata-50' : 'border-barro-200 bg-superficie hover:bg-barro-50'
      )}
    >
      <Store className="h-5 w-5 shrink-0 text-mata-700" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <b className="block truncate text-barro-900">{opcao.nome}</b>
        <span className="text-sm text-barro-600">{ROTULO_PAPEL[opcao.papel]}</span>
      </span>
      {pending ? <Loader2 className="h-5 w-5 animate-spin text-barro-600" aria-hidden="true" /> : atual && <Check className="h-5 w-5 text-mata-700" aria-label="Aberto agora" />}
    </button>
  )
}

/**
 * "Meus negócios": mostra qual negócio o painel está cuidando e deixa trocar
 * ou cadastrar outro. Aparece no topo do painel (celular) e no menu lateral.
 */
export function SeletorNegocio({
  negocios,
  atualId,
  podeCadastrar,
  acaoTrocar,
  tema = 'claro',
}: {
  negocios: Opcao[]
  atualId: string | null
  podeCadastrar: boolean
  acaoTrocar: (formData: FormData) => void
  tema?: 'claro' | 'escuro'
}) {
  const [aberto, setAberto] = useState(false)
  const atual = negocios.find((n) => n.id === atualId)
  if (!atual) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-haspopup="dialog"
        className={cn(
          'flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold',
          tema === 'escuro' ? 'bg-white/[0.08] text-white hover:bg-white/[0.14]' : 'border border-barro-200 bg-superficie text-barro-900'
        )}
      >
        <Store className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{atual.nome}</span>
        <span className={cn('shrink-0 text-xs font-medium', tema === 'escuro' ? 'text-[#A9D9BC]' : 'text-barro-600')}>
          {negocios.length > 1 ? `${negocios.length} negócios` : 'Trocar'}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
      <BottomSheet aberto={aberto} onFechar={() => setAberto(false)} titulo="Meus negócios">
        <form action={acaoTrocar} className="flex flex-col gap-2">
          {negocios.map((n) => (
            <BotaoOpcao key={n.id} opcao={n} atual={n.id === atualId} />
          ))}
        </form>
        {podeCadastrar ? (
          <Link
            href="/painel/negocio/cadastrar"
            onClick={() => setAberto(false)}
            className="mt-3 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-barro-300 font-semibold text-barro-900"
          >
            <Plus className="h-5 w-5" aria-hidden="true" /> Cadastrar outro negócio
          </Link>
        ) : (
          <p className="mt-3 text-sm text-barro-600">Você chegou ao limite de negócios desta conta. Precisa de mais? Fale com o suporte.</p>
        )}
      </BottomSheet>
    </>
  )
}
