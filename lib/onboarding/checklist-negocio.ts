/**
 * Checklist de configuração do negócio — calculado SÓ a partir do que está
 * no banco (nada de "marcar como feito" manual). Ordem = ordem sugerida.
 * Peso maior pro que mais influencia contato do cliente.
 */
export type DadosChecklistNegocio = {
  tipo_perfil: 'estabelecimento' | 'autonomo'
  descricao: string | null
  categoria_id: string | null
  whatsapp: string | null
  bairro: string | null
  endereco: string | null
  area_atendimento: string | null
  horario_funcionamento: Record<string, string> | null
  foto_capa_url: string | null
  galeria: string[] | null
  total_produtos: number
  total_posts: number
  total_cupons: number
}

export type ItemChecklist = {
  id: string
  titulo: string
  beneficio: string
  feito: boolean
  href: string
  peso: number
}

const ANCORA_INFO = '/painel/negocio/perfil'

export function montarChecklistNegocio(d: DadosChecklistNegocio): ItemChecklist[] {
  const autonomo = d.tipo_perfil === 'autonomo'
  return [
    {
      id: 'whatsapp',
      titulo: 'Inclua seu WhatsApp',
      beneficio: 'É o botão mais clicado do perfil — sem ele, o cliente não tem como te chamar.',
      feito: !!d.whatsapp && d.whatsapp.replace(/\D/g, '').length >= 10,
      href: ANCORA_INFO,
      peso: 3,
    },
    {
      id: 'descricao',
      titulo: 'Escreva uma descrição',
      beneficio: 'Duas ou três frases sobre o que você faz ajudam a busca a te encontrar.',
      feito: (d.descricao?.trim().length ?? 0) >= 30,
      href: ANCORA_INFO,
      peso: 2,
    },
    {
      id: 'categoria',
      titulo: 'Escolha a categoria',
      beneficio: 'Você aparece quando alguém filtra por esse tipo de serviço.',
      feito: !!d.categoria_id,
      href: ANCORA_INFO,
      peso: 2,
    },
    autonomo
      ? {
          id: 'area',
          titulo: 'Diga onde você atende',
          beneficio: 'Bairros ou região — sem precisar mostrar seu endereço.',
          feito: !!d.area_atendimento?.trim() || !!d.bairro?.trim(),
          href: ANCORA_INFO,
          peso: 2,
        }
      : {
          id: 'endereco',
          titulo: 'Informe endereço e bairro',
          beneficio: 'Quem está por perto encontra você e sabe como chegar.',
          feito: !!d.endereco?.trim() && !!d.bairro?.trim(),
          href: ANCORA_INFO,
          peso: 2,
        },
    {
      id: 'horario',
      titulo: autonomo ? 'Informe sua disponibilidade' : 'Informe o horário de funcionamento',
      beneficio: 'Evita mensagem fora de hora e mostra que o perfil está atualizado.',
      feito: !!d.horario_funcionamento && Object.keys(d.horario_funcionamento).length > 0,
      href: ANCORA_INFO,
      peso: 1,
    },
    {
      id: 'capa',
      titulo: 'Adicione uma foto de capa',
      beneficio: 'Perfis com foto chamam mais atenção na busca e na página inicial.',
      feito: !!d.foto_capa_url,
      href: ANCORA_INFO,
      peso: 2,
    },
    {
      id: 'galeria',
      titulo: autonomo ? 'Mostre fotos dos seus trabalhos' : 'Coloque fotos do espaço ou dos produtos',
      beneficio: 'Fotos reais passam confiança antes do primeiro contato.',
      feito: (d.galeria?.length ?? 0) >= 2,
      href: '/painel/negocio/perfil#fotos',
      peso: 1,
    },
    {
      id: 'produto',
      titulo: autonomo ? 'Cadastre seu primeiro serviço' : 'Cadastre seu primeiro produto',
      beneficio: 'Quem já vê o que você oferece (e o preço) chega mais decidido.',
      feito: d.total_produtos > 0,
      href: '/painel/negocio/catalogo',
      peso: 2,
    },
    {
      id: 'novidade',
      titulo: 'Publique uma novidade',
      beneficio: 'Quem favoritou seu perfil é avisado — é o jeito mais barato de lembrar o cliente.',
      feito: d.total_posts > 0,
      href: '/painel/negocio/novidades',
      peso: 1,
    },
    {
      id: 'oferta',
      titulo: 'Crie uma oferta',
      beneficio: 'Ofertas aparecem na página inicial da cidade enquanto estiverem valendo.',
      feito: d.total_cupons > 0,
      href: '/painel/negocio/ofertas',
      peso: 1,
    },
  ]
}

export function progressoChecklist(itens: ItemChecklist[]) {
  const total = itens.reduce((s, i) => s + i.peso, 0)
  const feito = itens.filter((i) => i.feito).reduce((s, i) => s + i.peso, 0)
  const percentual = total === 0 ? 100 : Math.round((feito / total) * 100)
  const proximo = itens.find((i) => !i.feito) ?? null
  return { percentual, proximo, pendentes: itens.filter((i) => !i.feito) }
}
