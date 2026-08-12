import Link from 'next/link'
import { ArrowUpRight, CalendarCheck, ShoppingBag } from 'lucide-react'
import { Botao } from '@/components/ui/botao'

const SUGESTAO_POR_CATEGORIA: Record<
  string,
  { nome: string; icone: typeof CalendarCheck; texto: string; cta: string; url: string; cor: 'casca' | 'mata' }
> = {
  'beleza-estetica': {
    nome: 'Beloo',
    icone: CalendarCheck,
    texto: 'Cansado de organizar agenda pelo WhatsApp? O Beloo deixa cliente marcar sozinho, sem horário duplicado.',
    cta: 'Criar agenda grátis',
    url: 'https://beloo-xzdr.vercel.app',
    cor: 'casca',
  },
  'saude-bem-estar': {
    nome: 'Beloo',
    icone: CalendarCheck,
    texto: 'Atende com hora marcada? O Beloo organiza sua agenda e deixa cliente marcar sozinho, sem trocar mensagem.',
    cta: 'Criar agenda grátis',
    url: 'https://beloo-xzdr.vercel.app',
    cor: 'casca',
  },
  alimentacao: {
    nome: 'CatalogAI',
    icone: ShoppingBag,
    texto: 'Monte um cardápio digital com fotos e preço — pedido cai automático no seu WhatsApp, sem trocar mensagem uma por uma.',
    cta: 'Testar 7 dias grátis',
    url: 'https://card-pio-digital-hazel.vercel.app',
    cor: 'mata',
  },
  'moda-vestuario': {
    nome: 'CatalogAI',
    icone: ShoppingBag,
    texto: 'Catálogo digital com fotos, preço e estoque em tempo real — cliente escolhe e o pedido cai no seu WhatsApp.',
    cta: 'Testar 7 dias grátis',
    url: 'https://card-pio-digital-hazel.vercel.app',
    cor: 'mata',
  },
}

export function CartaoFerramentaParceira({ categoriaSlug }: { categoriaSlug: string | null | undefined }) {
  const sugestao = categoriaSlug ? SUGESTAO_POR_CATEGORIA[categoriaSlug] : null

  if (!sugestao) {
    return (
      <div className="mt-8 rounded-casca border border-dashed border-barro-200 bg-white p-5 text-center">
        <p className="text-sm text-barro-500">
          Temos outras ferramentas que podem ajudar seu negócio a crescer.{' '}
          <Link href="/ferramentas" className="font-medium text-casca-600 hover:underline">
            Confira aqui
          </Link>
        </p>
      </div>
    )
  }

  const cores =
    sugestao.cor === 'casca'
      ? { bg: 'bg-casca-100', texto: 'text-casca-600', borda: 'border-casca-200', fundo: 'bg-casca-50' }
      : { bg: 'bg-mata-100', texto: 'text-mata-600', borda: 'border-mata-200', fundo: 'bg-mata-50' }

  return (
    <div className={`mt-8 rounded-casca border ${cores.borda} ${cores.fundo} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cores.bg} ${cores.texto}`}>
          <sugestao.icone className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-barro-800">{sugestao.nome}</p>
          <p className="text-sm text-barro-600">{sugestao.texto}</p>
        </div>
        <a href={sugestao.url} target="_blank" rel="noopener noreferrer">
          <Botao tamanho="sm" variante="secundario">
            {sugestao.cta} <ArrowUpRight className="h-3.5 w-3.5" />
          </Botao>
        </a>
      </div>
    </div>
  )
}
