'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Campo, AreaTexto } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { criarCupom } from '@/lib/actions/painel-negocio-actions'

/** datetime-local não tem fuso: converte no navegador (horário de quem preenche) pra ISO. */
function paraIso(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? '')
  if (!texto) return ''
  const data = new Date(texto)
  return Number.isNaN(data.getTime()) ? '' : data.toISOString()
}

function paraInputLocal(data: Date) {
  const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export function FormularioCriarCupom({ negocioId }: { negocioId: string }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [avancado, setAvancado] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    formData.set('expira_em_iso', paraIso(formData.get('expira_em')))
    formData.set('inicia_em_iso', paraIso(formData.get('inicia_em')))
    const resultado = await criarCupom(negocioId, formData)
    setCarregando(false)
    if (resultado?.erro) {
      setErro(resultado.erro)
      return
    }
    router.refresh()
  }

  // padrão: termina em 48h, pré-preenchido pra reduzir fricção
  const padraoExpira = paraInputLocal(new Date(Date.now() + 48 * 60 * 60 * 1000))

  return (
    <form action={handleSubmit} className="grid gap-3 sm:grid-cols-3">
      <Campo name="titulo" id="cupom_titulo" rotulo="Título da oferta" placeholder="Ex: Fim de semana" maxLength={120} required />
      <Campo name="desconto_texto" id="cupom_desconto" rotulo="Desconto" placeholder="Ex: 20% off, Leve 2 pague 1" maxLength={60} required />
      <Campo type="datetime-local" name="expira_em" id="cupom_expira" rotulo="Termina em" defaultValue={padraoExpira} required />

      <div className="sm:col-span-3">
        <button type="button" onClick={() => setAvancado((v) => !v)} aria-expanded={avancado} className="text-sm font-medium text-casca-700 underline">
          {avancado ? 'Menos opções' : 'Mais opções: condições, limite de cupons, preço de/por, agendar'}
        </button>
      </div>

      {avancado && (
        <>
          <div className="sm:col-span-3">
            <AreaTexto
              name="condicoes"
              id="cupom_condicoes"
              rotulo="Condições (opcional)"
              maxLength={500}
              placeholder="Ex: válido de segunda a quinta, não cumulativo, 1 por cliente"
              className="min-h-[72px]"
            />
          </div>
          <Campo name="limite_resgates" id="cupom_limite" type="number" min={1} rotulo="Quantos cupons no máximo" placeholder="Sem limite" />
          <Campo name="preco_original" id="cupom_preco_de" inputMode="decimal" rotulo="Preço normal (R$)" placeholder="Ex: 50,00" />
          <Campo name="preco_promocional" id="cupom_preco_por" inputMode="decimal" rotulo="Preço na oferta (R$)" placeholder="Ex: 39,90" />
          <Campo type="datetime-local" name="inicia_em" id="cupom_inicia" rotulo="Começa em (opcional)" />
          <p className="text-xs text-barro-500 sm:col-span-2">
            Com os dois preços preenchidos, o app calcula e mostra o percentual de desconto real. Com limite, cada cliente
            pega um código único e você confirma no balcão em &quot;Validar cupom&quot;.
          </p>
        </>
      )}

      {erro && (
        <p role="alert" className="text-sm text-red-600 sm:col-span-3">
          {erro}
        </p>
      )}

      <Botao type="submit" carregando={carregando} tamanho="sm" className="self-start sm:col-span-3">
        Publicar oferta
      </Botao>
    </form>
  )
}
