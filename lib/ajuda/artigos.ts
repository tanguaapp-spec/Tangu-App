/**
 * Central de ajuda. Conteúdo versionado junto com o código: quando um fluxo
 * mudar, o artigo muda no mesmo commit. NÃO escrever aqui preço, limite ou
 * prazo fixo — isso vem do banco (planos/configurações) e é mostrado nas
 * telas certas; o artigo aponta pra elas.
 */
export type CategoriaAjuda = 'primeiros-passos' | 'negocio' | 'ofertas' | 'planos' | 'conta' | 'privacidade'

export const CATEGORIAS_AJUDA: Record<CategoriaAjuda, string> = {
  'primeiros-passos': 'Primeiros passos',
  negocio: 'Seu negócio no app',
  ofertas: 'Ofertas, novidades e catálogo',
  planos: 'Planos e pagamentos',
  conta: 'Conta e acesso',
  privacidade: 'Privacidade e segurança',
}

export type ArtigoAjuda = {
  slug: string
  categoria: CategoriaAjuda
  titulo: string
  resumo: string
  passos: string[]
  observacoes?: string[]
  links?: { rotulo: string; href: string }[]
  palavras: string[]
}

export const ARTIGOS: ArtigoAjuda[] = [
  {
    slug: 'cadastrar-negocio',
    categoria: 'primeiros-passos',
    titulo: 'Como cadastrar meu negócio',
    resumo: 'Crie o perfil da sua loja ou do seu serviço em poucos minutos, sem esperar ninguém aprovar.',
    passos: [
      'Crie sua conta em "Cadastrar" (ou entre, se já tiver).',
      'Vá em Painel → Meu negócio → "Cadastrar meu negócio agora".',
      'Escolha se você tem ponto comercial ou é profissional autônomo.',
      'Preencha nome, categoria e WhatsApp (o resto pode ficar pra depois) e toque em "Criar meu perfil".',
      'Na maioria dos casos o perfil já aparece na busca na mesma hora. O painel mostra uma lista do que falta pra deixar o perfil completo.',
    ],
    observacoes: [
      'Se o cadastro cair numa verificação automática, ele fica "em análise" — normalmente até 2 dias úteis. Você pode continuar editando enquanto isso.',
      'Se o seu negócio já aparece no diretório (importado do Google), use "Reivindicar perfil" na página dele em vez de cadastrar outro.',
    ],
    links: [{ rotulo: 'Ir para o painel', href: '/painel/negocio' }],
    palavras: ['cadastro', 'cadastrar', 'loja', 'empresa', 'abrir', 'criar perfil', 'anunciar', 'aprovação'],
  },
  {
    slug: 'profissional-autonomo',
    categoria: 'primeiros-passos',
    titulo: 'Sou autônomo: preciso mostrar meu endereço?',
    resumo: 'Não. Profissional autônomo informa só o bairro e a área onde atende.',
    passos: [
      'No cadastro, escolha "Sou profissional autônomo".',
      'Em "Onde você atende", escreva os bairros ou cidades (ex.: "Tanguá toda e Rio Bonito").',
      'Marque como atende: vai até o cliente, recebe em casa (combinando antes) ou online.',
    ],
    observacoes: ['O campo de endereço nem aparece pra perfis autônomos — seu endereço residencial nunca fica público.'],
    links: [{ rotulo: 'Editar meu perfil', href: '/painel/negocio#informacoes' }],
    palavras: ['autônomo', 'autonomo', 'endereço', 'casa', 'domicílio', 'privacidade', 'diarista', 'eletricista', 'manicure'],
  },
  {
    slug: 'configurar-whatsapp',
    categoria: 'negocio',
    titulo: 'Como configurar o WhatsApp do meu negócio',
    resumo: 'O botão "Chamar no WhatsApp" é o contato mais usado pelos clientes.',
    passos: [
      'Painel → Meu negócio → Informações do negócio.',
      'Em WhatsApp, digite DDD + número, ex.: (21) 99999-9999. Não precisa do +55.',
      'Toque em "Salvar alterações" e confira no seu perfil público ("Ver como o cliente vê").',
    ],
    observacoes: ['Se aparecer "WhatsApp inválido", confira se colocou o DDD e todos os dígitos.'],
    links: [{ rotulo: 'Editar informações', href: '/painel/negocio#informacoes' }],
    palavras: ['whatsapp', 'zap', 'telefone', 'contato', 'número', 'botão'],
  },
  {
    slug: 'fotos-do-perfil',
    categoria: 'negocio',
    titulo: 'Como colocar foto de capa e fotos na galeria',
    resumo: 'Fotos reais do espaço, dos produtos ou do seu trabalho passam confiança.',
    passos: [
      'Painel → Meu negócio → Informações do negócio.',
      'Em "Foto de capa", escolha uma imagem. Em "Galeria de fotos" você pode escolher várias de uma vez.',
      'Toque em "Salvar alterações".',
    ],
    observacoes: [
      'Formatos aceitos: JPG, PNG, WebP ou GIF, até 5 MB por foto.',
      'A quantidade de fotos na galeria depende do seu plano — o painel mostra quantas você já usou.',
    ],
    links: [{ rotulo: 'Ver meu consumo do plano', href: '/painel/negocio/assinatura' }],
    palavras: ['foto', 'imagem', 'capa', 'galeria', 'upload', 'enviar foto', 'não carrega'],
  },
  {
    slug: 'catalogo-produtos',
    categoria: 'ofertas',
    titulo: 'Como cadastrar produtos e serviços com preço',
    resumo: 'Mostre o que você oferece. Quem já vê o preço chega mais decidido.',
    passos: [
      'Painel → Meu negócio → Catálogo de produtos e serviços.',
      'Informe nome, descrição curta e preço. Se o preço varia, marque "a partir de" ou deixe sem preço (orçamento).',
      'Toque em "Adicionar". O item aparece na página pública na hora.',
    ],
    observacoes: ['Chegou no limite do plano? Remova itens que não vende mais, ou veja os planos.'],
    links: [{ rotulo: 'Ir para o catálogo', href: '/painel/negocio#catalogo' }],
    palavras: ['produto', 'serviço', 'preço', 'catálogo', 'cardápio', 'tabela', 'orçamento'],
  },
  {
    slug: 'publicar-oferta',
    categoria: 'ofertas',
    titulo: 'Como publicar uma oferta',
    resumo: 'Ofertas com prazo aparecem no seu perfil e avisam quem favoritou seu negócio.',
    passos: [
      'Painel → Meu negócio → Oferta relâmpago.',
      'Dê um nome, descreva o desconto (ex.: "20% no corte", "Leve 3 pague 2") e escolha até quando vale.',
      'Toque em "Criar oferta". Quem favoritou seu perfil e ativou notificações recebe um aviso.',
      'Para encerrar antes do prazo, use "Encerrar" na lista de ofertas.',
    ],
    observacoes: [
      'Descreva exatamente a condição: o desconto é combinado direto entre você e o cliente.',
      'O número de ofertas valendo ao mesmo tempo depende do plano.',
    ],
    links: [{ rotulo: 'Criar oferta', href: '/painel/negocio#ofertas' }],
    palavras: ['oferta', 'promoção', 'desconto', 'cupom', 'liquidação'],
  },
  {
    slug: 'publicar-novidade',
    categoria: 'ofertas',
    titulo: 'Como publicar uma novidade e como corrigir',
    resumo: 'Novidades ficam no seu perfil e avisam quem favoritou seu negócio.',
    passos: [
      'Painel → Meu negócio → Publicar novidade.',
      'Escolha o tipo (novidade ou promoção), escreva um título claro e, se quiser, um texto.',
      'Publicou com erro? Publique de novo com a informação certa e peça ajuda pelo formulário de contato se precisar remover a antiga.',
    ],
    observacoes: ['Conteúdo denunciado e removido pela moderação gera um aviso pra você com o motivo. Se discordar, responda pelo formulário de contato.'],
    links: [{ rotulo: 'Publicar novidade', href: '/painel/negocio#novidade' }],
    palavras: ['novidade', 'post', 'publicação', 'publicar', 'corrigir', 'editar', 'removida', 'recusada'],
  },
  {
    slug: 'planos-e-pagamentos',
    categoria: 'planos',
    titulo: 'Como contratar, trocar ou cancelar um plano',
    resumo: 'Tudo pelo painel, sem falar com ninguém. Pagamento pelo Mercado Pago.',
    passos: [
      'Painel → Plano e assinatura.',
      'Compare os planos (os limites mostrados são os que valem de verdade) e toque em "Assinar".',
      'Você é levado ao Mercado Pago pra pagar. O plano é liberado quando o Mercado Pago confirma a cobrança — normalmente em minutos.',
      'Pra trocar de plano, toque em "Mudar para…". Os recursos mudam na hora e o novo valor vale a partir da próxima cobrança.',
      'Pra cancelar, toque em "Cancelar assinatura". Não há multa; o plano vale até o fim do período já pago.',
    ],
    observacoes: [
      'Voltou do Mercado Pago e o plano não ativou? Toque em "Verificar pagamento". Boleto pode levar até 3 dias úteis.',
      'Se uma cobrança for recusada, o plano continua por alguns dias enquanto o Mercado Pago tenta de novo. A tela mostra até quando.',
      'O Tanguá App não vê nem guarda dados do seu cartão.',
    ],
    links: [
      { rotulo: 'Plano e assinatura', href: '/painel/negocio/assinatura' },
      { rotulo: 'Comparar planos', href: '/planos' },
    ],
    palavras: ['plano', 'assinatura', 'pagar', 'pagamento', 'cancelar', 'upgrade', 'downgrade', 'cobrança', 'mercado pago', 'boleto', 'pix', 'cartão', 'recusado'],
  },
  {
    slug: 'limites-do-plano',
    categoria: 'planos',
    titulo: 'Cheguei no limite do plano. E agora?',
    resumo: 'Nada é apagado. Você só não consegue adicionar mais itens daquele tipo.',
    passos: [
      'Veja seu consumo em Painel → Plano e assinatura.',
      'Arquive ou remova o que não usa mais pra liberar espaço, ou troque de plano.',
    ],
    observacoes: ['Se você cancelar ou um pagamento falhar, os itens acima do limite ficam guardados — só a criação de novos é bloqueada.'],
    links: [{ rotulo: 'Ver consumo', href: '/painel/negocio/assinatura' }],
    palavras: ['limite', 'não consigo adicionar', 'bloqueado', 'cheio', 'máximo'],
  },
  {
    slug: 'recuperar-acesso',
    categoria: 'conta',
    titulo: 'Esqueci minha senha / não consigo entrar',
    resumo: 'Peça um link pra criar uma senha nova.',
    passos: [
      'Na tela Entrar, toque em "Esqueci minha senha".',
      'Digite o e-mail da conta e confira a caixa de entrada (e o spam).',
      'Abra o link em até 1 hora e crie a senha nova.',
    ],
    observacoes: [
      'Não chegou e-mail? Confira se digitou o mesmo e-mail do cadastro. Por segurança, a tela não diz se o e-mail existe.',
      'Mensagem "confirme seu e-mail"? Procure o e-mail de confirmação do cadastro e toque no link.',
    ],
    links: [{ rotulo: 'Recuperar senha', href: '/esqueci-senha' }],
    palavras: ['senha', 'esqueci', 'login', 'entrar', 'acesso', 'recuperar', 'confirmar email', 'link expirou'],
  },
  {
    slug: 'notificacoes',
    categoria: 'conta',
    titulo: 'Como configurar as notificações',
    resumo: 'Escolha o que quer receber. Avisos da sua conta (pagamento, suporte) sempre aparecem no app.',
    passos: [
      'Pra receber no celular, toque no sino no topo e permita notificações.',
      'Em Perfil → Comunicação, escolha quais avisos quer: novidades e ofertas de quem você favoritou, mural da cidade, resumo diário do bairro.',
    ],
    observacoes: ['No iPhone, as notificações só funcionam com o app instalado na tela inicial (Compartilhar → Adicionar à Tela de Início).'],
    links: [{ rotulo: 'Minhas preferências', href: '/perfil#comunicacao' }],
    palavras: ['notificação', 'notificações', 'aviso', 'push', 'sino', 'parar de receber', 'spam'],
  },
  {
    slug: 'meus-dados',
    categoria: 'privacidade',
    titulo: 'Como baixar meus dados ou excluir minha conta',
    resumo: 'Você pode baixar uma cópia dos seus dados e excluir a conta a qualquer momento.',
    passos: [
      'Perfil → Privacidade e dados.',
      '"Baixar meus dados" gera um arquivo com seu perfil, avaliações, favoritos, negócio e chamados.',
      '"Excluir minha conta" pede sua senha e apaga a conta. Se você tiver negócio, ele sai do ar e a assinatura é cancelada.',
    ],
    observacoes: [
      'Registros de pagamento podem ser mantidos pelo prazo exigido em lei, sem ligação com seu nome.',
      'A exclusão não pode ser desfeita.',
    ],
    links: [
      { rotulo: 'Privacidade e dados', href: '/perfil#privacidade' },
      { rotulo: 'Política de privacidade', href: '/privacidade' },
    ],
    palavras: ['lgpd', 'dados', 'excluir', 'apagar conta', 'deletar', 'exportar', 'baixar', 'privacidade'],
  },
  {
    slug: 'denunciar',
    categoria: 'privacidade',
    titulo: 'Como denunciar conteúdo ou perfil',
    resumo: 'Viu algo falso, ofensivo ou golpe? Denuncie — a equipe analisa.',
    passos: [
      'Toque em "Denunciar" no conteúdo (avaliação, aviso do mural ou perfil).',
      'Explique em poucas palavras o que está errado.',
      'A equipe revisa e remove o que violar os Termos de Uso.',
    ],
    observacoes: ['Em caso de golpe ou ameaça, procure também a polícia.'],
    links: [{ rotulo: 'Termos de uso', href: '/termos' }],
    palavras: ['denunciar', 'denúncia', 'golpe', 'falso', 'ofensivo', 'fraude', 'abuso'],
  },
]

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Busca simples por relevância (título > palavras-chave > resumo > passos). */
export function buscarArtigos(termo: string, limite = 10): ArtigoAjuda[] {
  const palavras = normalizar(termo)
    .split(/\s+/)
    .filter((p) => p.length >= 3)
  if (palavras.length === 0) return []

  return ARTIGOS.map((artigo) => {
    const titulo = normalizar(artigo.titulo)
    const chaves = normalizar(artigo.palavras.join(' '))
    const resumo = normalizar(artigo.resumo)
    const corpo = normalizar([...artigo.passos, ...(artigo.observacoes ?? [])].join(' '))
    let pontos = 0
    for (const p of palavras) {
      if (titulo.includes(p)) pontos += 5
      if (chaves.includes(p)) pontos += 4
      if (resumo.includes(p)) pontos += 2
      if (corpo.includes(p)) pontos += 1
    }
    return { artigo, pontos }
  })
    .filter((r) => r.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, limite)
    .map((r) => r.artigo)
}

export function artigoPorSlug(slug: string) {
  return ARTIGOS.find((a) => a.slug === slug) ?? null
}
