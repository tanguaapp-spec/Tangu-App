'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { DIAS_EXIBICAO, ROTULO_DIA, lerHorarioDia, type Dia } from '@/lib/horario/funcionamento'
import { cn } from '@/lib/utils'

type Turno = { abre: string; fecha: string }
type EstadoDia = { fechado: boolean; turnos: Turno[]; vazio: boolean }

const hhmm = (min: number) => `${String(Math.floor((min % 1440) / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

function inicial(texto: string | undefined): EstadoDia {
  const lido = lerHorarioDia(texto)
  if (!texto?.trim() || lido === null) return { fechado: false, turnos: [{ abre: '08:00', fecha: '18:00' }], vazio: true }
  if (lido.length === 0) return { fechado: true, turnos: [{ abre: '08:00', fecha: '18:00' }], vazio: false }
  return { fechado: false, turnos: lido.map(([a, f]) => ({ abre: hhmm(a), fecha: hhmm(f) })), vazio: false }
}

function serializar(d: EstadoDia) {
  if (d.vazio) return ''
  if (d.fechado) return 'Fechado'
  return d.turnos.filter((t) => t.abre && t.fecha).map((t) => `${t.abre}-${t.fecha}`).join(', ')
}

/**
 * Horário por dia com relógio (sem texto livre): é o que permite calcular
 * "Aberto agora" de verdade no perfil e no filtro da busca.
 */
export function EditorHorario({ horario }: { horario: Record<string, string> | null }) {
  const [dias, setDias] = useState<Record<Dia, EstadoDia>>(
    () => Object.fromEntries(DIAS_EXIBICAO.map((d) => [d, inicial(horario?.[d])])) as Record<Dia, EstadoDia>
  )
  const muda = (dia: Dia, f: (d: EstadoDia) => EstadoDia) => setDias((atual) => ({ ...atual, [dia]: f(atual[dia]) }))

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold text-barro-900">Horário de funcionamento</legend>
      <p className="-mt-1 mb-1 text-xs text-barro-600">Com o horário preenchido, o app mostra “Aberto agora” sozinho. Deixe em branco o dia que não quer informar.</p>
      {DIAS_EXIBICAO.map((dia) => {
        const d = dias[dia]
        return (
          <div key={dia} className="flex flex-wrap items-center gap-2 rounded-[14px] bg-feira px-3 py-2">
            <input type="hidden" name={`horario_${dia}`} value={serializar(d)} />
            <span className="w-[72px] shrink-0 text-sm font-semibold text-barro-900">{ROTULO_DIA[dia]}</span>
            <div role="radiogroup" aria-label={`${ROTULO_DIA[dia]}: situação`} className="flex gap-1">
              {(['aberto', 'fechado', 'vazio'] as const).map((op) => {
                const ativo = op === 'vazio' ? d.vazio : op === 'fechado' ? !d.vazio && d.fechado : !d.vazio && !d.fechado
                return (
                  <button
                    key={op}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => muda(dia, (x) => ({ ...x, vazio: op === 'vazio', fechado: op === 'fechado' }))}
                    className={cn('h-9 rounded-full px-2.5 text-xs font-semibold', ativo ? 'bg-serra text-white' : 'border border-barro-200 bg-superficie text-barro-800')}
                  >
                    {op === 'aberto' ? 'Abre' : op === 'fechado' ? 'Fechado' : 'Não informar'}
                  </button>
                )
              })}
            </div>
            {!d.vazio && !d.fechado && (
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                {d.turnos.map((t, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <input
                      type="time"
                      aria-label={`${ROTULO_DIA[dia]}: abre às`}
                      value={t.abre}
                      onChange={(e) => muda(dia, (x) => ({ ...x, turnos: x.turnos.map((tt, j) => (j === i ? { ...tt, abre: e.target.value } : tt)) }))}
                      className="h-9 rounded-lg border border-barro-200 bg-superficie px-2 font-mono text-sm text-barro-900"
                    />
                    <span className="text-barro-600">–</span>
                    <input
                      type="time"
                      aria-label={`${ROTULO_DIA[dia]}: fecha às`}
                      value={t.fecha}
                      onChange={(e) => muda(dia, (x) => ({ ...x, turnos: x.turnos.map((tt, j) => (j === i ? { ...tt, fecha: e.target.value } : tt)) }))}
                      className="h-9 rounded-lg border border-barro-200 bg-superficie px-2 font-mono text-sm text-barro-900"
                    />
                    {i > 0 && (
                      <button
                        type="button"
                        aria-label="Tirar segundo turno"
                        onClick={() => muda(dia, (x) => ({ ...x, turnos: x.turnos.filter((_, j) => j !== i) }))}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-barro-600"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </span>
                ))}
                {d.turnos.length < 2 && (
                  <button
                    type="button"
                    onClick={() => muda(dia, (x) => ({ ...x, turnos: [...x.turnos, { abre: '14:00', fecha: '18:00' }] }))}
                    className="flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-casca-700"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" /> intervalo
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
      <button
        type="button"
        onClick={() => setDias((atual) => ({ ...atual, ter: atual.seg, qua: atual.seg, qui: atual.seg, sex: atual.seg }))}
        className="self-start text-sm font-semibold text-casca-700 underline underline-offset-4"
      >
        Copiar a segunda pra terça a sexta
      </button>
    </fieldset>
  )
}
