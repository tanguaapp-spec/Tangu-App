'use client'

import { useMemo, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { registrarCliqueWhatsapp } from '@/lib/actions/negocio-actions'
import { linkWhatsapp, cn } from '@/lib/utils'
import { horariosDoDia, mensagemAgendamento } from '@/lib/vendas/whatsapp'

type Servico = { id: string; nome: string; duracao: number }

const campo = 'w-full rounded-[14px] border border-barro-200 bg-superficie px-3 py-3 text-base text-barro-900'

/** Escolhe serviço, dia e horário livre pelo horário de funcionamento e pede o horário no WhatsApp. */
export function AgendaWhatsapp({ negocioId, negocio, whatsapp, servicos, horario }: { negocioId: string; negocio: string; whatsapp: string; servicos: Servico[]; horario: Record<string, string> | null }) {
  const [aberto, setAberto] = useState(false)
  const [servicoId, setServicoId] = useState(servicos[0]?.id ?? '')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [nome, setNome] = useState('')
  const [obs, setObs] = useState('')
  const servico = servicos.find((s) => s.id === servicoId) ?? servicos[0]

  // próximos 14 dias que têm algum horário
  const dias = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
    const lista: { data: string; rotulo: string }[] = []
    for (let i = 0; i < 14 && lista.length < 10; i++) {
      const d = new Date(Date.now() + i * 86400e3)
      const iso = fmt.format(d)
      if (horariosDoDia(horario, iso, servico?.duracao ?? 30).length === 0) continue
      const rotulo = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
      lista.push({ data: iso, rotulo })
    }
    return lista
  }, [horario, servico?.duracao])
  const horas = data ? horariosDoDia(horario, data, servico?.duracao ?? 30) : []
  const pronto = servico && data && hora && nome.trim().length >= 2

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-serra bg-superficie px-5 font-bold text-serra"
      >
        <CalendarClock className="h-5 w-5" aria-hidden="true" /> Agendar horário
      </button>
      <BottomSheet aberto={aberto} onFechar={() => setAberto(false)} titulo="Agendar horário">
        <div className="flex flex-col gap-4">
          {servicos.length > 1 && (
            <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
              Serviço
              <select
                value={servicoId}
                onChange={(e) => {
                  setServicoId(e.target.value)
                  setHora('')
                }}
                className={campo}
              >
                {servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} ({s.duracao} min)
                  </option>
                ))}
              </select>
            </label>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold text-barro-800">Dia</p>
            {dias.length === 0 ? (
              <p className="text-sm text-barro-600">Sem horário de funcionamento cadastrado para os próximos dias. Chame direto no WhatsApp.</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                {dias.map((d) => (
                  <button
                    key={d.data}
                    type="button"
                    aria-pressed={data === d.data}
                    onClick={() => {
                      setData(d.data)
                      setHora('')
                    }}
                    className={cn('min-h-11 shrink-0 rounded-xl border px-3.5 text-sm font-semibold capitalize', data === d.data ? 'border-serra bg-serra text-white' : 'border-barro-200 text-barro-900')}
                  >
                    {d.rotulo}
                  </button>
                ))}
              </div>
            )}
          </div>
          {data && (
            <div>
              <p className="mb-2 text-sm font-semibold text-barro-800">Horário</p>
              <div className="grid grid-cols-4 gap-2">
                {horas.map((h) => (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={hora === h}
                    onClick={() => setHora(h)}
                    className={cn('min-h-11 rounded-xl border font-mono text-sm font-bold', hora === h ? 'border-serra bg-serra text-white' : 'border-barro-200 text-barro-900')}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
            Seu nome
            <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} autoComplete="name" className={campo} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
            Observação (opcional)
            <input value={obs} onChange={(e) => setObs(e.target.value)} maxLength={200} className={campo} />
          </label>
          {pronto ? (
            <a
              href={linkWhatsapp(whatsapp, mensagemAgendamento({ negocio, servico: servico.nome, data, hora, nome: nome.trim(), observacao: obs.trim() }))}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => registrarCliqueWhatsapp(negocioId).catch(() => undefined)}
              className="flex min-h-[52px] items-center justify-center rounded-2xl bg-[#1F8A4C] font-bold text-white"
            >
              Pedir este horário no WhatsApp
            </a>
          ) : (
            <p className="text-center text-sm font-semibold text-barro-600">Escolha o dia, o horário e diga seu nome.</p>
          )}
          <p className="text-center text-xs text-barro-500">O horário só fica marcado quando o negócio confirmar na conversa.</p>
        </div>
      </BottomSheet>
    </>
  )
}
