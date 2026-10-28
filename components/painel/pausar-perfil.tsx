'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PauseCircle, PlayCircle } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { alternarNegocioAtivo } from '@/lib/actions/painel-negocio-actions'

/** Férias, reforma, mudança: tira o perfil do ar sem apagar nada, com confirmação antes. */
export function PausarPerfil({ negocioId, ativo }: { negocioId: string; ativo: boolean }) {
  const [confirmando, setConfirmando] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()

  async function alternar(valor: boolean) {
    setCarregando(true)
    setErro(null)
    const r = await chamarAcao(alternarNegocioAtivo(negocioId, valor))
    setCarregando(false)
    setConfirmando(false)
    if (r.erro) setErro(r.erro)
    else router.refresh()
  }

  return (
    <section id="pausar" aria-label="Pausar perfil" className="flex scroll-mt-20 flex-col gap-3 rounded-[24px] border border-barro-200/80 bg-superficie p-4 md:p-5">
      <div className="flex items-start gap-3">
        {ativo ? <PauseCircle className="mt-0.5 h-6 w-6 shrink-0 text-barro-600" aria-hidden="true" /> : <PlayCircle className="mt-0.5 h-6 w-6 shrink-0 text-mata-700" aria-hidden="true" />}
        <div>
          <h2 className="font-display text-lg font-bold text-barro-900">{ativo ? 'Pausar o perfil' : 'Seu perfil está pausado'}</h2>
          <p className="text-sm text-barro-600">
            {ativo
              ? 'Vai tirar férias ou fechar por um tempo? Pausar tira o negócio das buscas. Nada é apagado e você reativa quando quiser.'
              : 'Ninguém encontra seu negócio nas buscas agora. Reative para voltar a aparecer na hora.'}
          </p>
        </div>
      </div>
      {ativo ? (
        confirmando ? (
          <div className="flex flex-wrap gap-2">
            <Botao variante="perigo" carregando={carregando} onClick={() => alternar(false)}>
              Sim, pausar agora
            </Botao>
            <Botao variante="fantasma" onClick={() => setConfirmando(false)}>
              Cancelar
            </Botao>
          </div>
        ) : (
          <Botao variante="fantasma" className="self-start" onClick={() => setConfirmando(true)}>
            Pausar perfil
          </Botao>
        )
      ) : (
        <Botao className="self-start" carregando={carregando} onClick={() => alternar(true)}>
          Reativar perfil
        </Botao>
      )}
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
    </section>
  )
}
