export type PapelUsuario = 'morador' | 'profissional' | 'admin'
export type StatusReivindicacao = 'pendente' | 'aprovado' | 'rejeitado'
export type StatusVaga = 'aberta' | 'pausada' | 'encerrada'
export type TipoPost = 'novidade' | 'promocao' | 'vaga_propria'
export type TipoAviso = 'aviso' | 'evento' | 'utilidade_publica' | 'achados_perdidos' | 'pergunta'
export type ModalidadeAtendimento = 'loja_fisica' | 'atende_em_casa' | 'atende_domicilio' | 'servico_digital'
export type TipoEventoPerfil = 'visualizacao' | 'favorito' | 'clique_whatsapp'
export type TipoReacaoAviso = 'gostei' | 'parabens' | 'obrigado'
export type TipoConteudoDenuncia = 'avaliacao' | 'aviso' | 'resposta_pergunta'
export type StatusDenuncia = 'pendente' | 'removido' | 'arquivado'
export type StatusProspeccao = 'novo' | 'contactado' | 'convidado' | 'convertido' | 'ignorado'

export type Perfil = {
  id: string
  nome_completo: string
  telefone: string | null
  whatsapp: string | null
  avatar_url: string | null
  papel: PapelUsuario
  bairro: string | null
  notificacoes_resumo_diario: boolean
  codigo_convite: string | null
  convidado_por: string | null
  criado_em: string
  atualizado_em: string
}

export type Categoria = {
  id: string
  nome: string
  slug: string
  icone: string | null
  ordem: number
}

export type Negocio = {
  id: string
  google_place_id: string | null
  origem: 'importado' | 'cadastro_manual'
  nome: string
  categoria_id: string | null
  categoria?: Categoria
  descricao: string | null
  endereco: string | null
  bairro: string | null
  latitude: number | null
  longitude: number | null
  telefone: string | null
  whatsapp: string | null
  instagram: string | null
  site: string | null
  horario_funcionamento: Record<string, string> | null
  foto_capa_url: string | null
  galeria: string[]
  nota_google: number | null
  total_avaliacoes_google: number | null
  verificado: boolean
  reivindicado_por: string | null
  reivindicado_em: string | null
  destaque_ativo: boolean
  destaque_expira_em: string | null
  formas_pagamento: string[] | null
  modalidades_atendimento: ModalidadeAtendimento[]
  aberto_agora: boolean | null
  status_cadastro: StatusReivindicacao
  motivo_rejeicao: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export type SolicitacaoReivindicacao = {
  id: string
  negocio_id: string
  solicitante_id: string
  documento_url: string | null
  mensagem: string | null
  status: StatusReivindicacao
  revisado_por: string | null
  revisado_em: string | null
  criado_em: string
}

export type PostNegocio = {
  id: string
  negocio_id: string
  autor_id: string
  tipo: TipoPost
  titulo: string
  conteudo: string | null
  imagem_url: string | null
  link_externo: string | null
  ativo: boolean
  visualizacoes: number
  cliques_contato: number
  criado_em: string
  expira_em: string | null
  negocio?: Negocio
}

export type Avaliacao = {
  id: string
  negocio_id: string
  autor_id: string
  nota: number
  comentario: string | null
  foto_url: string | null
  resposta_profissional: string | null
  respondido_em: string | null
  criado_em: string
  autor?: Perfil
}

export type Vaga = {
  id: string
  titulo: string
  empresa_nome: string
  negocio_id: string | null
  descricao: string
  requisitos: string | null
  area: string | null
  tipo_contrato: string | null
  salario_faixa: string | null
  bairro: string | null
  contato_whatsapp: string | null
  contato_email: string | null
  status: StatusVaga
  publicado_por: string
  criado_em: string
  expira_em: string | null
}

export type AvisoCidade = {
  id: string
  tipo: TipoAviso
  titulo: string
  conteudo: string
  imagem_url: string | null
  bairro: string | null
  local_evento: string | null
  data_evento: string | null
  publicado_por: string
  fixado: boolean
  ativo: boolean
  criado_em: string
}

export type ProdutoServico = {
  id: string
  negocio_id: string
  nome: string
  descricao: string | null
  preco: number | null
  preco_a_partir_de: boolean
  imagem_url: string | null
  ordem: number
  ativo: boolean
  criado_em: string
}

export type Cupom = {
  id: string
  negocio_id: string
  titulo: string
  desconto_texto: string
  expira_em: string
  ativo: boolean
  criado_em: string
}

export type EventoPerfil = {
  id: string
  negocio_id: string
  tipo: TipoEventoPerfil
  criado_em: string
}

export type RespostaPergunta = {
  id: string
  aviso_id: string
  negocio_id: string
  autor_id: string
  criado_em: string
  negocio?: Negocio
}

export type ReacaoAviso = {
  aviso_id: string
  perfil_id: string
  tipo: TipoReacaoAviso
  criado_em: string
}

export type PontoLaranja = {
  id: string
  perfil_id: string
  quantidade: number
  motivo: string
  criado_em: string
}

export type CartaoFidelidade = {
  id: string
  negocio_id: string
  perfil_id: string
  carimbos: number
  meta: number
  completos: number
  criado_em: string
  atualizado_em: string
  negocio?: Negocio
}

export type Denuncia = {
  id: string
  tipo_conteudo: TipoConteudoDenuncia
  conteudo_id: string
  negocio_id: string | null
  motivo: string
  denunciante_id: string
  status: StatusDenuncia
  revisado_por: string | null
  revisado_em: string | null
  criado_em: string
  denunciante?: Perfil
  negocio?: Negocio
}

export type ProspeccaoNegocio = {
  id: string
  google_place_id: string
  nome: string
  categoria_slug: string | null
  endereco: string | null
  bairro: string | null
  telefone: string | null
  site: string | null
  latitude: number | null
  longitude: number | null
  nota_google: number | null
  total_avaliacoes_google: number | null
  negocio_vinculado_id: string | null
  status: StatusProspeccao
  observacoes: string | null
  sincronizado_em: string
  criado_em: string
}

export type PushSubscriptionSalva = {
  id: string
  perfil_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  criado_em: string
}

type TabelaGenerica<T> = {
  Row: T
  Insert: Partial<T>
  Update: Partial<T>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      perfis: TabelaGenerica<Perfil>
      categorias: TabelaGenerica<Categoria>
      negocios: TabelaGenerica<Negocio>
      solicitacoes_reivindicacao: TabelaGenerica<SolicitacaoReivindicacao>
      posts_negocio: TabelaGenerica<PostNegocio>
      avaliacoes: TabelaGenerica<Avaliacao>
      vagas: TabelaGenerica<Vaga>
      avisos_cidade: TabelaGenerica<AvisoCidade>
      favoritos: TabelaGenerica<{ perfil_id: string; negocio_id: string; criado_em: string }>
      push_subscriptions: TabelaGenerica<PushSubscriptionSalva>
      produtos_servicos: TabelaGenerica<ProdutoServico>
      cupons: TabelaGenerica<Cupom>
      eventos_perfil: TabelaGenerica<EventoPerfil>
      respostas_pergunta: TabelaGenerica<RespostaPergunta>
      reacoes_aviso: TabelaGenerica<ReacaoAviso>
      pontos_laranjas: TabelaGenerica<PontoLaranja>
      cartoes_fidelidade: TabelaGenerica<CartaoFidelidade>
      denuncias: TabelaGenerica<Denuncia>
      prospeccoes_negocios: TabelaGenerica<ProspeccaoNegocio>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: PapelUsuario
      claim_status: StatusReivindicacao
      vaga_status: StatusVaga
      post_tipo: TipoPost
      aviso_tipo: TipoAviso
      modalidade_atendimento: ModalidadeAtendimento
      tipo_conteudo_denuncia: TipoConteudoDenuncia
    }
    CompositeTypes: Record<string, never>
  }
}
