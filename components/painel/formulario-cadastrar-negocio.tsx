'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Campo, AreaTexto } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { cadastrarNegocio } from '@/lib/actions/painel-negocio-actions'
import { CampoModalidadeAtendimento } from '@/components/painel/campo-modalidade-atendimento'
import { precisaDeEndereco } from '@/lib/modalidades'
import type { Categoria, ModalidadeAtendimento } from '@/lib/types/database'

export function FormularioCadastrarNegocio({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [modalidades, setModalidades] = useState<ModalidadeAtendimento[]>([])

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)

    const resultado = await cadastrarNegocio(formData)

    if (resultado?.erro) {
      setErro(resultado.erro)
      setCarregando(false)
      return
    }

    router.push('/painel/negocio')
    router.refresh()
  }

  return (
    <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Campo name="nome" id="nome" rotulo="Nome do negócio ou seu nome profissional" placeholder="Ex: Oficina do Zé, Salão da Ana..." required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="categoria_id" className="text-sm font-medium text-barro-800">
          Categoria
        </label>
        <select
          id="categoria_id"
          name="categoria_id"
          required
          className="w-full rounded-xl border border-barro-300 bg-white px-4 py-2.5 text-barro-900 focus:border-casca-500 focus:ring-2 focus:ring-casca-100"
        >
          <option value="">Selecione...</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <Campo name="bairro" id="bairro" rotulo="Bairro" placeholder="Centro, Manilha..." />

      <div className="sm:col-span-2">
        <AreaTexto
          name="descricao"
          id="descricao"
          rotulo="Descrição"
          placeholder="Conte pra cidade o que você faz, seus diferenciais..."
        />
      </div>

      <div className="sm:col-span-2">
        <CampoModalidadeAtendimento selecionadas={modalidades} onChange={setModalidades} />
      </div>

      <Campo
        name="endereco"
        id="endereco"
        rotulo={precisaDeEndereco(modalidades) ? 'Endereço' : 'Endereço (opcional)'}
        placeholder={precisaDeEndereco(modalidades) ? 'Rua, número...' : 'Não precisa se for só atendimento digital'}
      />
      <Campo name="whatsapp" id="whatsapp" rotulo="WhatsApp" placeholder="(21) 99999-9999" required />
      <Campo name="telefone" id="telefone" rotulo="Telefone fixo (opcional)" placeholder="(21) 2665-0000" />
      <Campo name="instagram" id="instagram" rotulo="Instagram (opcional)" placeholder="@seuusuario" />
      <div className="sm:col-span-2">
        <Campo name="site" id="site" rotulo="Site (opcional)" placeholder="https://" />
      </div>

      {erro && <p className="text-sm text-red-600 sm:col-span-2">{erro}</p>}

      <p className="text-sm text-barro-500 sm:col-span-2">
        Seu cadastro passa por uma checagem rápida da equipe antes de ficar visível no diretório —
        assim mantemos a confiança de quem procura profissionais na cidade.
      </p>

      <Botao type="submit" carregando={carregando} className="self-start sm:col-span-2">
        Enviar cadastro
      </Botao>
    </form>
  )
}
