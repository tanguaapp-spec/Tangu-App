'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Store, UserRound } from 'lucide-react'
import { Campo, AreaTexto } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { cadastrarNegocio } from '@/lib/actions/painel-negocio-actions'
import { CampoModalidadeAtendimento } from '@/components/painel/campo-modalidade-atendimento'
import { precisaDeEndereco } from '@/lib/modalidades'
import { cn } from '@/lib/utils'
import type { Categoria, ModalidadeAtendimento } from '@/lib/types/database'

type TipoPerfil = 'estabelecimento' | 'autonomo'

const TIPOS: { valor: TipoPerfil; titulo: string; texto: string; icone: typeof Store }[] = [
  { valor: 'estabelecimento', titulo: 'Tenho um ponto comercial', texto: 'Loja, salão, oficina, restaurante…', icone: Store },
  { valor: 'autonomo', titulo: 'Sou profissional autônomo', texto: 'Atendo em casa, vou até o cliente ou trabalho online', icone: UserRound },
]

export function FormularioCadastrarNegocio({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [tipo, setTipo] = useState<TipoPerfil>('estabelecimento')
  const [modalidades, setModalidades] = useState<ModalidadeAtendimento[]>(['loja_fisica'])

  function escolherTipo(novo: TipoPerfil) {
    setTipo(novo)
    setModalidades(novo === 'autonomo' ? ['atende_domicilio'] : ['loja_fisica'])
  }

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    formData.set('tipo_perfil', tipo)

    const resultado = await cadastrarNegocio(formData)

    if (resultado?.erro) {
      setErro(resultado.erro)
      setCarregando(false)
      return
    }

    router.push('/painel/negocio?bemvindo=1')
    router.refresh()
  }

  const autonomo = tipo === 'autonomo'
  // autônomo que recebe em casa precisa de bairro, nunca de endereço público
  const pedirEndereco = !autonomo && precisaDeEndereco(modalidades)

  return (
    <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium text-barro-800">Como você atende?</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {TIPOS.map((t) => (
            <label
              key={t.valor}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                tipo === t.valor ? 'border-casca-500 bg-casca-50 ring-2 ring-casca-100' : 'border-barro-200 bg-superficie hover:bg-barro-50'
              )}
            >
              <input
                type="radio"
                name="tipo_perfil_opcao"
                value={t.valor}
                checked={tipo === t.valor}
                onChange={() => escolherTipo(t.valor)}
                className="sr-only"
              />
              <t.icone className="mt-0.5 h-5 w-5 shrink-0 text-casca-700" aria-hidden="true" />
              <span>
                <span className="block font-semibold text-barro-900">{t.titulo}</span>
                <span className="block text-sm text-barro-600">{t.texto}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="sm:col-span-2">
        <Campo
          name="nome"
          id="nome"
          rotulo={autonomo ? 'Seu nome profissional' : 'Nome do negócio'}
          placeholder={autonomo ? 'Ex: Ana Manicure, Zé Eletricista' : 'Ex: Padaria Central, Oficina do Zé'}
          minLength={2}
          maxLength={120}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="categoria_id" className="text-sm font-medium text-barro-800">
          {autonomo ? 'Especialidade' : 'Categoria'}
        </label>
        <select
          id="categoria_id"
          name="categoria_id"
          required
          className="w-full rounded-xl border border-barro-300 bg-superficie px-4 py-2.5 text-barro-900 focus:border-casca-500 focus:ring-2 focus:ring-casca-100"
        >
          <option value="">Selecione...</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <Campo
        name="whatsapp"
        id="whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        rotulo="WhatsApp (com DDD)"
        placeholder="(21) 99999-9999"
        required
      />

      <div className="sm:col-span-2">
        <AreaTexto
          name="descricao"
          id="descricao"
          rotulo="Descrição"
          maxLength={2000}
          placeholder={
            autonomo
              ? 'Que serviços você faz, há quanto tempo, se trabalha com orçamento...'
              : 'O que você vende ou faz, seus diferenciais...'
          }
        />
      </div>

      <div className="sm:col-span-2">
        <CampoModalidadeAtendimento selecionadas={modalidades} onChange={setModalidades} />
      </div>

      {autonomo ? (
        <>
          <Campo name="bairro" id="bairro" rotulo="Seu bairro (opcional)" placeholder="Centro, Duques..." />
          <Campo
            name="area_atendimento"
            id="area_atendimento"
            rotulo="Onde você atende"
            placeholder="Ex: Tanguá toda e Rio Bonito"
            maxLength={200}
          />
          <p className="-mt-2 text-xs text-barro-500 sm:col-span-2">
            Seu endereço residencial nunca é pedido nem mostrado. O cliente vê só o bairro e a área que você informar.
          </p>
        </>
      ) : (
        <>
          <Campo
            name="endereco"
            id="endereco"
            rotulo={pedirEndereco ? 'Endereço' : 'Endereço (opcional)'}
            placeholder="Rua, número"
            maxLength={200}
          />
          <Campo name="bairro" id="bairro" rotulo="Bairro" placeholder="Centro, Manilha..." />
        </>
      )}

      <Campo name="telefone" id="telefone" type="tel" rotulo="Telefone fixo (opcional)" placeholder="(21) 2665-0000" />
      <Campo name="instagram" id="instagram" rotulo="Instagram (opcional)" placeholder="@seuusuario" />
      <div className="sm:col-span-2">
        <Campo name="site" id="site" type="url" inputMode="url" rotulo="Site (opcional)" placeholder="seusite.com.br" />
      </div>

      {erro && (
        <p role="alert" className="text-sm text-red-600 sm:col-span-2">
          {erro}
        </p>
      )}

      <p className="text-sm text-barro-500 sm:col-span-2">
        Na maioria dos casos o perfil entra no ar assim que você salva. Fotos, catálogo e horários você completa depois,
        no painel — dá pra sair e voltar quando quiser.
      </p>

      <Botao type="submit" carregando={carregando} className="self-start sm:col-span-2">
        Criar meu perfil
      </Botao>
    </form>
  )
}
