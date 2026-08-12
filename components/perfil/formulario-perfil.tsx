'use client'

import { useState } from 'react'
import { Campo } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { atualizarPerfil } from '@/lib/actions/perfil-actions'
import type { Perfil } from '@/lib/types/database'

export function FormularioPerfil({ perfil }: { perfil: Perfil }) {
  const [nome, setNome] = useState(perfil.nome_completo ?? '')
  const [telefone, setTelefone] = useState(perfil.telefone ?? '')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setSalvo(false)
    setErro(null)

    const resultado = await atualizarPerfil({ nome_completo: nome, telefone })

    setSalvando(false)
    if (resultado?.erro) {
      setErro(resultado.erro)
      return
    }
    setSalvo(true)
  }

  return (
    <form onSubmit={handleSalvar} className="space-y-4 rounded-casca border border-barro-100 bg-white p-6 shadow-feira">
      <Campo rotulo="Nome completo" id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
      <Campo rotulo="Telefone" id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(21) 99999-9999" />

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {salvo && <p className="text-sm text-mata-600">Perfil atualizado com sucesso.</p>}

      <Botao type="submit" carregando={salvando} className="mt-2">
        Salvar perfil
      </Botao>
    </form>
  )
}
