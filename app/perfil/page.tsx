'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Campo } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { atualizarPerfil } from '@/lib/actions/perfil-actions'
import { redirect } from 'next/navigation'
import { User } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function PaginaPerfil() {
  const [user, setUser] = useState<any>(null)
  const [perfil, setPerfil] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return redirect('/entrar')
      setUser(user)
      const { data } = await supabase.from('perfis').select('*').eq('id', user.id).single()
      if (data) {
        setPerfil(data)
        setNome(data.nome_completo || '')
        setTelefone(data.telefone || '')
      }
      setCarregando(false)
    }
    fetchData()
  }, [supabase])

  if (carregando) {
    return <div className="mx-auto max-w-3xl px-4 py-10">Carregando...</div>
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    const result = await atualizarPerfil({
      nome_completo: nome,
      telefone,
    })
    setSalvando(false)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mata-100 text-mata-600">
          <User className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-display font-semibold text-barro-900">
          Meu perfil
        </h1>
      </div>

      <form onSubmit={handleSalvar} className="space-y-4 rounded-casca border border-barro-100 bg-white p-6 shadow-feira">
        <Campo
          label="Nome completo"
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <Campo
          label="Telefone"
          id="telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        <Botao type="submit" className="mt-4" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar perfil'}
        </Botao>
      </form>
    </div>
  )
}
