'use client'

import { useState } from 'react'
import { enviarComunicado } from '@/lib/actions/admin-gestao-actions'

const campo = 'w-full rounded-xl border border-barro-200 bg-superficie px-3 text-sm text-barro-900'

export function FormularioComunicado() {
  const [publico, setPublico] = useState('todos')
  const [estado, setEstado] = useState<{ erro?: string | null; total?: number } | null>(null)
  const [enviando, setEnviando] = useState(false)
  return (
    <form
      action={async (dados) => {
        if (!window.confirm('Enviar agora? Não dá pra desfazer.')) return
        setEnviando(true)
        setEstado(await enviarComunicado(dados))
        setEnviando(false)
      }}
      className="flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1 text-sm font-semibold text-barro-900">
        Pra quem
        <select name="publico" value={publico} onChange={(e) => setPublico(e.target.value)} className={`${campo} h-11`}>
          <option value="todos">Todo mundo</option>
          <option value="moradores">Só moradores</option>
          <option value="lojistas">Só donos de negócio</option>
          <option value="sem_negocio_completo">Donos com perfil incompleto (sem foto ou descrição)</option>
          <option value="bairro">Um bairro</option>
        </select>
      </label>
      {publico === 'bairro' && <input name="bairro" required aria-label="Bairro" placeholder="Bairro (igual está no perfil)" className={`${campo} h-11`} />}
      <input name="titulo" required maxLength={120} aria-label="Título" placeholder="Título" className={`${campo} h-11`} />
      <textarea name="corpo" maxLength={400} aria-label="Texto" placeholder="Texto (opcional)" className={`${campo} min-h-[90px] py-2`} />
      <input name="url" aria-label="Página que abre" placeholder="Abrir qual página? (ex.: /ofertas) — opcional" className={`${campo} h-11 font-mono`} />
      {estado?.erro && (
        <p role="alert" className="text-sm text-red-700">
          {estado.erro}
        </p>
      )}
      {estado && !estado.erro && (
        <p role="status" className="text-sm font-semibold text-mata-700">
          Enviado para {estado.total} pessoa(s).
        </p>
      )}
      <button disabled={enviando} className="h-11 rounded-xl bg-laranja font-bold text-tinta disabled:opacity-60">
        {enviando ? 'Enviando…' : 'Enviar comunicado'}
      </button>
    </form>
  )
}
