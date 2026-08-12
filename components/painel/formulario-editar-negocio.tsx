'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Campo, AreaTexto } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { atualizarNegocio, removerFotoGaleria } from '@/lib/actions/painel-negocio-actions'
import { CampoModalidadeAtendimento } from '@/components/painel/campo-modalidade-atendimento'
import type { Negocio, Categoria, ModalidadeAtendimento } from '@/lib/types/database'
import Image from 'next/image'
import { X } from 'lucide-react'

const DIAS_SEMANA: { chave: string; rotulo: string }[] = [
  { chave: 'seg', rotulo: 'Segunda' },
  { chave: 'ter', rotulo: 'Terça' },
  { chave: 'qua', rotulo: 'Quarta' },
  { chave: 'qui', rotulo: 'Quinta' },
  { chave: 'sex', rotulo: 'Sexta' },
  { chave: 'sab', rotulo: 'Sábado' },
  { chave: 'dom', rotulo: 'Domingo' },
]

const OPCOES_PAGAMENTO = ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Boleto']

export function FormularioEditarNegocio({ negocio, categorias }: { negocio: Negocio; categorias: Categoria[] }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [galeria, setGaleria] = useState<string[]>(negocio.galeria ?? [])
  const [formasPagamento, setFormasPagamento] = useState<string[]>(negocio.formas_pagamento ?? [])
  const [modalidades, setModalidades] = useState<ModalidadeAtendimento[]>(negocio.modalidades_atendimento ?? [])

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setSalvo(false)
    setErro(null)

    const resultado = await atualizarNegocio(negocio.id, formData)

    setCarregando(false)
    if (resultado?.erro) {
      setErro(resultado.erro)
      return
    }
    setSalvo(true)
    router.refresh()
  }

  async function removerFoto(url: string) {
    setGaleria((atual) => atual.filter((g) => g !== url))
    await removerFotoGaleria(negocio.id, url)
    router.refresh()
  }

  function alternarPagamento(opcao: string) {
    setFormasPagamento((atual) =>
      atual.includes(opcao) ? atual.filter((o) => o !== opcao) : [...atual, opcao]
    )
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo name="nome" id="nome" rotulo="Nome do negócio" defaultValue={negocio.nome} required />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="categoria_id" className="text-sm font-medium text-barro-800">
            Categoria
          </label>
          <select
            id="categoria_id"
            name="categoria_id"
            defaultValue={negocio.categoria_id ?? ''}
            className="w-full rounded-xl border border-barro-300 bg-white px-4 py-2.5 text-barro-900 focus:border-casca-500 focus:ring-2 focus:ring-casca-100"
          >
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <AreaTexto
        name="descricao"
        id="descricao"
        rotulo="Descrição do negócio"
        defaultValue={negocio.descricao ?? ''}
        placeholder="Conte pra cidade o que você faz, seus diferenciais..."
      />

      <CampoModalidadeAtendimento selecionadas={modalidades} onChange={setModalidades} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo name="whatsapp" id="whatsapp" rotulo="WhatsApp" defaultValue={negocio.whatsapp ?? ''} placeholder="(21) 99999-9999" />
        <Campo name="telefone" id="telefone" rotulo="Telefone fixo" defaultValue={negocio.telefone ?? ''} placeholder="(21) 2665-0000" />
        <Campo name="instagram" id="instagram" rotulo="Instagram" defaultValue={negocio.instagram ?? ''} placeholder="@seuusuario" />
        <Campo name="site" id="site" rotulo="Site" defaultValue={negocio.site ?? ''} placeholder="https://" />
        <Campo name="endereco" id="endereco" rotulo="Endereço" defaultValue={negocio.endereco ?? ''} />
        <Campo name="bairro" id="bairro" rotulo="Bairro" defaultValue={negocio.bairro ?? ''} placeholder="Centro, Manilha..." />
      </div>

      <div>
        <span className="text-sm font-medium text-barro-800">Horário de funcionamento</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {DIAS_SEMANA.map((dia) => (
            <div key={dia.chave} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-sm text-barro-600">{dia.rotulo}</span>
              <input
                name={`horario_${dia.chave}`}
                defaultValue={negocio.horario_funcionamento?.[dia.chave] ?? ''}
                placeholder="08:00-18:00 ou Fechado"
                className="w-full rounded-lg border border-barro-300 bg-white px-3 py-1.5 text-sm text-barro-900 focus:border-casca-500 focus:ring-2 focus:ring-casca-100"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-sm font-medium text-barro-800">Formas de pagamento aceitas</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {OPCOES_PAGAMENTO.map((opcao) => (
            <label
              key={opcao}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                formasPagamento.includes(opcao)
                  ? 'border-mata-500 bg-mata-50 text-mata-700'
                  : 'border-barro-200 text-barro-600'
              }`}
            >
              <input
                type="checkbox"
                name="formas_pagamento"
                value={opcao}
                checked={formasPagamento.includes(opcao)}
                onChange={() => alternarPagamento(opcao)}
                className="sr-only"
              />
              {opcao}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="foto_capa" className="text-sm font-medium text-barro-800">
          Foto de capa
        </label>
        {negocio.foto_capa_url && (
          <div className="relative mt-2 h-32 w-full max-w-xs overflow-hidden rounded-xl bg-barro-100">
            <Image src={negocio.foto_capa_url} alt="Capa atual" fill className="object-cover" />
          </div>
        )}
        <input
          type="file"
          id="foto_capa"
          name="foto_capa"
          accept="image/*"
          className="mt-2 block w-full text-sm text-barro-600 file:mr-3 file:rounded-lg file:border-0 file:bg-barro-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-barro-700 hover:file:bg-barro-200"
        />
      </div>

      <div>
        <span className="text-sm font-medium text-barro-800">Galeria de fotos</span>
        {galeria.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {galeria.map((url) => (
              <div key={url} className="group relative h-20 overflow-hidden rounded-lg bg-barro-100">
                <Image src={url} alt="Foto da galeria" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => removerFoto(url)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remover foto"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          type="file"
          name="galeria_novas"
          accept="image/*"
          multiple
          className="mt-2 block w-full text-sm text-barro-600 file:mr-3 file:rounded-lg file:border-0 file:bg-barro-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-barro-700 hover:file:bg-barro-200"
        />
        <p className="mt-1 text-xs text-barro-400">Você pode selecionar várias fotos de uma vez. Máximo 5MB por foto.</p>
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {salvo && <p className="text-sm text-mata-600">Dados salvos com sucesso.</p>}
      <Botao type="submit" carregando={carregando} className="self-start">
        Salvar alterações
      </Botao>
    </form>
  )
}
