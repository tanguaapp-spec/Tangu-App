'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/botao'
import { importarLista, type RelatorioImportacao } from '@/lib/actions/importacao-actions'

/** Envia a lista, mostra a prévia (nada gravado) e só então importa de verdade. */
export function FormularioImportar() {
  const form = useRef<HTMLFormElement>(null)
  const [rel, setRel] = useState<RelatorioImportacao | null>(null)
  const [carregando, setCarregando] = useState<'previa' | 'importar' | null>(null)
  const router = useRouter()

  async function rodar(acao: 'previa' | 'importar') {
    if (!form.current) return
    const fd = new FormData(form.current)
    fd.set('acao', acao)
    setCarregando(acao)
    const r = await chamarAcao(importarLista(fd))
    setCarregando(null)
    setRel(r)
    if (!r.simulacao && !r.erro) router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <form ref={form} onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3">
        <label className="text-sm">
          <span className="text-barro-600">Arquivo da lista (.json do BoraAli ou .csv)</span>
          <input
            type="file"
            name="arquivo"
            accept=".json,.csv,application/json,text/csv"
            required
            onChange={() => setRel(null)}
            className="mt-1 w-full rounded-lg border border-barro-300 bg-superficie px-3 py-2 text-sm"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <Botao type="button" variante="fantasma" carregando={carregando === 'previa'} onClick={() => rodar('previa')}>
            {carregando === 'previa' ? 'Lendo a lista…' : '1. Ver prévia (não grava nada)'}
          </Botao>
          {rel?.simulacao && !rel.erro && rel.novos + rel.atualizados + rel.servicosUteis > 0 && (
            <Botao type="button" carregando={carregando === 'importar'} onClick={() => rodar('importar')}>
              {carregando === 'importar' ? 'Importando…' : `2. Importar ${rel.novos} novos`}
            </Botao>
          )}
        </div>
      </form>

      {rel?.erro && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {rel.erro}
        </p>
      )}
      {rel && !rel.erro && (
        <section role="status" className={`flex flex-col gap-3 rounded-2xl p-4 ${rel.simulacao ? 'bg-casca-50 text-casca-950' : 'bg-mata-50 text-mata-950'}`}>
          <b className="font-display text-lg">{rel.simulacao ? 'Prévia: nada foi gravado ainda' : 'Importação concluída'}</b>
          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <li>Linhas lidas: <b>{rel.lidas}</b></li>
            <li>{rel.simulacao ? 'Vão entrar' : 'Entraram'}: <b>{rel.novos}</b></li>
            <li>Atualizados: <b>{rel.atualizados}</b></li>
            <li>Já existiam: <b>{rel.jaExistem}</b></li>
            <li>Já têm dono (intocados): <b>{rel.reivindicados}</b></li>
            <li>Serviços públicos: <b>{rel.servicosUteis}</b></li>
          </ul>
          {Object.keys(rel.porCategoria).length > 0 && (
            <p className="text-sm">
              Por categoria:{' '}
              {Object.entries(rel.porCategoria)
                .sort((a, b) => b[1] - a[1])
                .map(([c, n]) => `${c} (${n})`)
                .join(' · ')}
            </p>
          )}
          {rel.exemplos.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold">Exemplos</summary>
              <ul className="mt-2 list-disc pl-5">
                {rel.exemplos.map((e) => (
                  <li key={e.nome}>
                    {e.nome} · {e.categoria}
                    {e.bairro && ` · ${e.bairro}`}
                    {e.telefone ? ` · ${e.telefone}` : ' · sem telefone'}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {rel.ignorados.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold">Ignorados ({rel.ignorados.length})</summary>
              <ul className="mt-2 list-disc pl-5">
                {rel.ignorados.slice(0, 50).map((e, i) => (
                  <li key={i}>
                    {e.nome}: {e.motivo}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </div>
  )
}
