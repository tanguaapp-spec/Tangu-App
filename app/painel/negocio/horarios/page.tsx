import type { Metadata } from 'next'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { createClient } from '@/lib/supabase/server'
import { recursoLiberado } from '@/lib/planos/recursos'
import { removerHorarioEspecial, salvarHorarioEspecial } from '@/lib/actions/horarios-actions'
import { TituloPainel, CartaoPainel } from '@/components/painel/titulo-painel'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { RecursoBloqueado } from '@/components/painel/recurso-bloqueado'

export const metadata: Metadata = { title: 'Feriados e horários especiais', robots: { index: false } }
export const dynamic = 'force-dynamic'

const campo = 'w-full rounded-[14px] border border-barro-200 bg-superficie px-3 py-3 text-base'

export default async function PaginaHorariosEspeciais() {
  const { negocio, papel } = await exigirNegocio('/painel/negocio/horarios')
  const liberado = await recursoLiberado(negocio.id, 'horarios_especiais')
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const { data: lista } = liberado
    ? await createClient().from('horarios_especiais').select('id, data, fechado, abre, fecha, motivo').eq('negocio_id', negocio.id).gte('data', hoje).order('data')
    : { data: [] }

  return (
    <div className="flex flex-col gap-5">
      <TituloPainel
        titulo="Feriados e horários especiais"
        descricao="Vai fechar num feriado ou abrir em horário diferente? Avise aqui. O selo “aberto agora” e a busca acertam sozinhos naquele dia."
        voltar="/painel/negocio/perfil"
      />
      {!liberado ? (
        <RecursoBloqueado recurso="horarios_especiais" souDono={papel === 'dono'} />
      ) : (
        <>
          <CartaoPainel titulo="Adicionar dia">
            <FormularioAcao acao={salvarHorarioEspecial} rotuloBotao="Salvar dia">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
                  Data
                  <input type="date" name="data" required min={hoje} className={campo} />
                </label>
                <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
                  Motivo (aparece pro cliente)
                  <input name="motivo" maxLength={80} placeholder="Ex.: Feriado de Natal" className={campo} />
                </label>
                <fieldset className="flex flex-col gap-2 text-sm sm:col-span-2">
                  <legend className="mb-1 font-semibold text-barro-800">Nesse dia</legend>
                  <label className="flex min-h-11 items-center gap-2">
                    <input type="radio" name="tipo" value="fechado" defaultChecked className="h-5 w-5" /> Fechado o dia todo
                  </label>
                  <label className="flex min-h-11 items-center gap-2">
                    <input type="radio" name="tipo" value="especial" className="h-5 w-5" /> Aberto em horário diferente:
                  </label>
                  <div className="grid grid-cols-2 gap-3 pl-7">
                    <label className="flex flex-col gap-1 text-barro-700">
                      Abre
                      <input type="time" name="abre" className={campo} />
                    </label>
                    <label className="flex flex-col gap-1 text-barro-700">
                      Fecha
                      <input type="time" name="fecha" className={campo} />
                    </label>
                  </div>
                </fieldset>
              </div>
            </FormularioAcao>
          </CartaoPainel>
          <CartaoPainel titulo="Próximos dias avisados">
            {(lista ?? []).length === 0 ? (
              <p className="text-sm text-barro-600">Nenhum dia especial cadastrado.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-barro-100">
                {(lista ?? []).map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <b className="block text-barro-900">
                        {new Date(`${h.data}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
                      </b>
                      <span className="text-sm text-barro-600">
                        {h.fechado ? 'Fechado' : `${String(h.abre).slice(0, 5)} às ${String(h.fecha).slice(0, 5)}`}
                        {h.motivo && ` · ${h.motivo}`}
                      </span>
                    </span>
                    <FormularioAcao acao={removerHorarioEspecial} rotuloBotao="Remover">
                      <input type="hidden" name="id" value={h.id} />
                    </FormularioAcao>
                  </li>
                ))}
              </ul>
            )}
          </CartaoPainel>
        </>
      )}
    </div>
  )
}
