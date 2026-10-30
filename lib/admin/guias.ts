/**
 * Textos de "como funciona" do painel admin: o que cada tela faz, o que o
 * app resolve sozinho e o que fica com o time. Usado no topo de cada aba
 * (GuiaPagina) e reunido na página "Como o app funciona".
 * Ao mudar um fluxo no código, atualize o texto aqui.
 */

export type Guia = {
  /** nome da aba no menu */
  titulo: string
  href: string
  /** uma frase: para que serve */
  resumo: string
  /** o que acontece sem ninguém mexer */
  sozinho: string[]
  /** o que o time precisa fazer */
  voces: string[]
  /** ordem prática, quando há um processo */
  passos?: string[]
  /** onde o usuário/lojista é avisado ou onde configurar */
  dica?: string
}

export const GUIAS = {
  visao: {
    titulo: 'Visão geral',
    href: '/painel/admin',
    resumo: 'O resumo do dia: o que está esperando vocês (moderação, suporte, reivindicações), saúde do app e números de uso.',
    sozinho: ['Os números vêm direto do banco a cada visita, sem planilha.', 'Cartões em vermelho indicam fila esperando alguém.'],
    voces: ['Abrir esta tela uma vez por dia e zerar os cartões em vermelho, começando por Suporte e Cadastros sinalizados.'],
  },
  crescimento: {
    titulo: 'Crescimento (métricas)',
    href: '/painel/admin/crescimento',
    resumo: 'Diagnóstico do negócio Tanguá App: quantos moradores e comércios, quem paga, quanto entra por mês, quanto custa trazer cada cliente e o parecer do app.',
    sozinho: [
      'Receita, assinantes, cancelamentos, conversão do grátis para pago e uso do app são calculados sozinhos.',
      'A nota de satisfação (NPS) vem da pergunta que aparece para lojistas e moradores dentro do app.',
      'O parecer no topo diz qual número está pior e o que fazer.',
    ],
    voces: [
      'Lançar aqui o que gastaram em divulgação (Instagram, panfleto, rádio). Sem isso o custo por cliente (CAC) fica zerado.',
      'Seguir o parecer e usar a tela de Leads para agir.',
    ],
  },
  leads: {
    titulo: 'Leads (quem contatar)',
    href: '/painel/admin/leads',
    resumo: 'Listas de quem vale a pena chamar no WhatsApp, montadas sozinhas a partir do uso do app, com o motivo e a mensagem pronta.',
    sozinho: [
      'O app separa os comércios em listas: grátis com movimento, fim do teste grátis, desistiu do pagamento, cadastro incompleto, não reivindicado e cancelou.',
      'Cada contato ganha uma temperatura (quente, morno, frio) pelos cliques no WhatsApp, visitas e favoritos dos últimos 30 dias.',
      'A mensagem do WhatsApp já vem escrita com os números do comércio.',
    ],
    voces: [
      'Tocar em "Chamar no WhatsApp", enviar a mensagem e depois abrir "Registrar contato" para anotar a etapa (contatado, interessado, cliente…) e a data do retorno.',
      'Começar o dia pela aba "Contatar hoje": são os retornos que vocês marcaram.',
    ],
    passos: ['Escolha a lista', 'Use "Contatar um de cada vez" para ir em sequência', 'Envie a mensagem', 'Registre o resultado e marque o retorno'],
    dica: 'A equipe de crescimento (cadastrada em Usuários) vê esta mesma tela em /painel/crescimento.',
  },
  divulgacao: {
    titulo: 'Divulgação paga',
    href: '/painel/admin/divulgacao',
    resumo: 'Vendas avulsas de divulgação (banner, destaque na busca, post patrocinado) que o próprio lojista compra pelo painel dele.',
    sozinho: [
      'O lojista escolhe o serviço e paga no Mercado Pago (Pix ou cartão). O status vem do Mercado Pago, nunca do navegador.',
      'Pagamento aprovado: vocês recebem uma notificação "Nova venda de divulgação" e o lojista recebe a confirmação.',
      'Destaque na busca entra no ar sozinho na hora e sai sozinho quando vencem os dias comprados.',
      'Todo dia de madrugada o app confere pagamentos pendentes e encerra o que venceu. Estorno tira o destaque do ar.',
    ],
    voces: [
      'Banner e post dependem de arte: chamar o lojista no WhatsApp, combinar a arte, subir aqui e colocar "no ar" com as datas.',
      'Cadastrar e ajustar os serviços à venda (nome, preço, dias) na lista de serviços desta tela.',
    ],
    passos: ['Chega a notificação de venda', 'Compra aparece como "Pago"', 'Combinar a arte pelo WhatsApp', 'Subir a arte e pôr no ar', 'O app encerra no fim do prazo'],
    dica: 'O WhatsApp do time que aparece para o lojista depois da compra é configurado em Configurações.',
  },
  importar: {
    titulo: 'Importar comércios',
    href: '/painel/admin/importar',
    resumo: 'Coloca de uma vez no app os comércios da cidade a partir de uma lista (JSON do BoraAli ou CSV), como perfis ainda sem dono.',
    sozinho: [
      'A prévia mostra o que vai entrar sem gravar nada.',
      'Reimportar a mesma lista atualiza os dados e nunca mexe num perfil que o dono já assumiu.',
      'Cada perfil importado mostra o aviso "Aguardando reivindicação" e o botão "Sou o dono".',
    ],
    voces: [
      'Conferir a prévia antes de importar.',
      'Decidir os pedidos de "ocultar perfil" (lista no fim desta tela): o dono pede, vocês confirmam e o perfil some do app.',
    ],
    dica: 'Pedido de ocultar gera notificação para vocês.',
  },
  conteudo: {
    titulo: 'Notícias, eventos e serviços',
    href: '/painel/admin/conteudo',
    resumo: 'Revisão do que moradores sugerem (notícias e eventos) e do que chega do RSS da Prefeitura, e cadastro dos serviços úteis (telefones e endereços públicos).',
    sozinho: [
      'Todo dia às 8h o app busca as notícias novas nas fontes RSS e deixa aqui como rascunho.',
      'Morador que sugere notícia ou evento gera notificação para vocês.',
    ],
    voces: ['Publicar ou descartar cada sugestão e rascunho (nada vai para o público sem vocês).', 'Manter a lista de serviços úteis atualizada.'],
    dica: 'As fontes RSS ficam em Configurações.',
  },
  recursos: {
    titulo: 'Recursos do app',
    href: '/painel/admin/recursos',
    resumo: 'Liga e desliga partes inteiras do app para todo mundo (mapa, mural, vagas, orçamentos, notícias…).',
    sozinho: ['Desligar esconde o recurso na hora, inclusive dos menus. Nada é apagado: religar traz tudo de volta.'],
    voces: ['Usar para lançar um recurso só quando estiver pronto, ou tirar do ar algo que esteja dando problema.'],
    dica: 'Para escolher quais planos têm cada ferramenta, use "Planos e recursos".',
  },
  logs: {
    titulo: 'Logs de erro',
    href: '/painel/admin/logs',
    resumo: 'Erros que aconteceram no app (na tela de alguém, nos pagamentos, nas tarefas automáticas), agrupados, com aparelho, versão e pessoa afetada.',
    sozinho: [
      'Os erros são capturados sem ninguém precisar reportar. Erros iguais aparecem juntos.',
      'Erro grave em produção manda notificação para vocês. Registros com mais de 90 dias são apagados.',
    ],
    voces: ['Abrir o erro, copiar o relatório e enviar para quem cuida do código. Depois de corrigido, marcar como resolvido com uma nota.'],
  },
  pendentes: {
    titulo: 'Cadastros sinalizados',
    href: '/painel/admin/negocios-pendentes',
    resumo: 'Comércios que se cadastraram e foram segurados por uma regra de segurança antes de aparecer no app.',
    sozinho: [
      'Cadastro comum entra no ar na hora, sem passar por aqui.',
      'Vem para esta fila quando: o texto tem um termo sinalizado, a conta já teve cadastro recusado, há cadastros demais na mesma hora ou a moderação prévia está ligada.',
      'Vocês recebem uma notificação a cada cadastro sinalizado.',
    ],
    voces: ['Aprovar (entra no ar) ou recusar com o motivo (o dono é avisado e pode corrigir e reenviar).'],
    dica: 'Termos sinalizados e moderação prévia ficam em Configurações.',
  },
  negocios: {
    titulo: 'Negócios',
    href: '/painel/admin/negocios',
    resumo: 'Todos os comércios aprovados: dar o selo de verificado, ligar destaque manual e corrigir dados de qualquer perfil.',
    sozinho: ['Destaque comprado pela Divulgação paga entra e sai sozinho; não precisa mexer aqui.'],
    voces: [
      'Verificado: dar o selo depois de confirmar que o comércio existe (visita, documento ou conversa).',
      'Destaque manual: só para cortesia ou acerto feito fora do app.',
      'Editar: corrigir telefone, endereço ou categoria, principalmente dos importados. Fica registrado na Auditoria.',
    ],
  },
  usuarios: {
    titulo: 'Usuários',
    href: '/painel/admin/usuarios',
    resumo: 'Todas as contas: dados do cadastro, negócios, plano, interesses e atividade. Aqui também se dá acesso à equipe de crescimento.',
    sozinho: [
      'Quem cadastra um negócio vira "profissional" sozinho.',
      'Suspender bloqueia o login na hora e registra na Auditoria.',
    ],
    voces: [
      'Abrir "Ver dados" para atender um chamado ou conferir uma denúncia.',
      'Suspender só com motivo claro (golpe, abuso). Reativar desfaz.',
      'Equipe de crescimento: digitar o e-mail da conta da pessoa e "Dar acesso". Ela passa a ver só Crescimento e Leads.',
    ],
    dica: 'Admin só se cria pelo SQL Editor do Supabase, por segurança.',
  },
  categorias: {
    titulo: 'Categorias',
    href: '/painel/admin/categorias',
    resumo: 'As categorias e subcategorias de comércio que aparecem na busca, no cadastro e na página inicial.',
    sozinho: ['Quem abre uma categoria principal vê também os comércios das subcategorias. O endereço da categoria é criado a partir do nome.'],
    voces: ['Criar com nome e ícone, ordenar, marcar "Início" para virar atalho na página inicial e desativar o que não usar (some do app, sem apagar).'],
  },
  comunicados: {
    titulo: 'Comunicados',
    href: '/painel/admin/comunicados',
    resumo:
      'Mandar um aviso no sino do app e por notificação no celular para: todo mundo, só moradores, só lojistas, um bairro ou lojistas com perfil incompleto.',
    sozinho: ['Quem desligou "Avisos do mural" não recebe os comunicados ao público geral. Há um limite diário de notificações por pessoa.'],
    voces: ['Escrever, escolher o público e enviar. Usar com moderação: aviso demais faz a pessoa desligar as notificações.'],
  },
  reivindicacoes: {
    titulo: 'Reivindicações',
    href: '/painel/admin/reivindicacoes',
    resumo: 'Quando alguém diz "Sou o dono" de um perfil que ainda não tem dono (os importados).',
    sozinho: [
      'Se o perfil tem WhatsApp cadastrado, o dono pede um código. Vocês recebem uma notificação e o código aparece na fila "Códigos para enviar".',
      'Quando o dono digita o código certo, assume o perfil na hora, sem precisar de aprovação. O código vale 48h e aceita 5 tentativas.',
      'Perfil sem telefone usa o pedido antigo: cai na fila de aprovação e vocês recebem notificação.',
    ],
    voces: [
      'Códigos: tocar em "Enviar no WhatsApp". Abre a conversa com o número que JÁ estava no cadastro do comércio, com o código escrito. Depois marcar como enviado.',
      'Pedidos antigos: confirmar que a pessoa é mesmo responsável (ligar no telefone do comércio, por exemplo) e aprovar ou recusar. O dono é avisado.',
    ],
    passos: ['Dono toca em "Sou o dono"', 'Pede o código', 'Vocês enviam no WhatsApp do comércio', 'Dono digita o código', 'Perfil passa a ser dele'],
  },
  denuncias: {
    titulo: 'Denúncias',
    href: '/painel/admin/denuncias',
    resumo: 'Avaliações, posts do mural, respostas e perfis que alguém denunciou.',
    sozinho: ['A denúncia entra na fila e aparece no cartão da Visão geral. Nada é escondido sozinho.'],
    voces: [
      '"Remover" tira o conteúdo do app e fecha a denúncia.',
      '"Arquivar" fecha sem mexer no conteúdo (denúncia sem razão).',
      'Se for golpe ou abuso repetido, suspender a conta em Usuários.',
    ],
    dica: 'Não há notificação para denúncias: confira o cartão da Visão geral todo dia.',
  },
  vagas: {
    titulo: 'Vagas',
    href: '/painel/admin/vagas',
    resumo: 'Vagas de emprego da cidade.',
    sozinho: ['Lojistas publicam as próprias vagas pelo painel deles, sem passar por vocês.'],
    voces: ['Publicar aqui as vagas que chegam por fora (empresa sem perfil, Prefeitura, pedido pelo WhatsApp) e encerrar as preenchidas.'],
  },
  avisos: {
    titulo: 'Avisos da cidade',
    href: '/painel/admin/avisos',
    resumo: 'Avisos oficiais, eventos e utilidade pública que aparecem no mural e na agenda.',
    sozinho: ['Quem marca "Tenho interesse" num evento recebe lembrete na véspera.'],
    voces: ['Publicar avisos e eventos e remover os que passaram ou estão errados.'],
  },
  prospeccao: {
    titulo: 'Prospecção (Google Maps)',
    href: '/painel/admin/prospeccao',
    resumo: 'Lista privada de comércios de Tanguá no Google Maps que ainda não estão no app.',
    sozinho: ['"Sincronizar" busca no Google Maps e esconde quem já está no app. A mensagem de convite muda conforme o tipo de comércio.'],
    voces: ['Chamar no WhatsApp com a mensagem pronta e atualizar a situação (contatado, interessado, entrou…).'],
    dica: 'Esta lista nunca aparece para o público.',
  },
  suporte: {
    titulo: 'Chamados de suporte',
    href: '/painel/admin/suporte',
    resumo: 'Dúvidas e problemas que moradores e lojistas abrem em "Ajuda e suporte".',
    sozinho: [
      'Cada chamado novo manda notificação para vocês. Os mais antigos sem resposta aparecem primeiro.',
      'Quando vocês respondem ou resolvem, a pessoa é avisada no app e pode responder de volta.',
      'Depois de resolvido, a pessoa dá uma nota ao atendimento (vai para Crescimento).',
    ],
    voces: [
      'Responder dentro do chamado e mudar a situação (respondido, resolvido). Responder no mesmo dia sempre que possível.',
      'Pedidos de acesso pelo WhatsApp (quadro laranja no topo): tocar em "Gerar link e enviar no WhatsApp" e mandar a mensagem. O link vale 1 hora, então gere só na hora de enviar.',
    ],
    dica: 'Para mandar o link de nova senha a alguém que pediu por outro canal, use Usuários → Ver dados → "Mandar link de nova senha no WhatsApp".',
  },
  assinaturas: {
    titulo: 'Assinaturas e pagamentos',
    href: '/painel/admin/assinaturas',
    resumo: 'Quem assina qual plano, situação de cada cobrança e histórico de pagamentos. Só leitura.',
    sozinho: [
      'O lojista assina, troca ou cancela o plano sozinho pelo painel dele, pagando no Mercado Pago.',
      'O Mercado Pago avisa o app a cada cobrança; todo dia de madrugada o app confere tudo de novo.',
      'Cobrança falhou: o plano continua valendo por alguns dias de tolerância (Configurações) e depois volta para o Gratuito sozinho.',
      'Cancelou: o plano vale até o fim do período já pago.',
      'Negócio novo pode ganhar dias de teste grátis do plano pago (Configurações → dias de teste grátis; 0 desliga).',
    ],
    voces: ['Acompanhar. Problema de cobrança se resolve no painel do Mercado Pago; aqui ninguém concede plano na mão.'],
  },
  planos: {
    titulo: 'Planos e recursos',
    href: '/painel/admin/planos',
    resumo: 'Os planos à venda (Gratuito, Essencial, Destaque, Premium), preço, limites e quais ferramentas cada um libera.',
    sozinho: ['Mudou um recurso ou limite: vale na hora para todos os negócios do plano. Reduzir limite não apaga nada. Quem já assina mantém o preço contratado.'],
    voces: ['Ajustar preço, limites e recursos com cuidado. Toda mudança fica na Auditoria.'],
  },
  configuracoes: {
    titulo: 'Configurações',
    href: '/painel/admin/configuracoes',
    resumo: 'Regras globais do app: teste grátis, bônus de indicação, tolerância de cobrança, moderação, WhatsApp do time, fontes de notícia e mais.',
    sozinho: ['Cada mudança vale na hora e fica registrada na Auditoria.'],
    voces: ['Conferir pelo menos: dias de teste grátis, WhatsApp do time, e-mail de contato e moderação prévia.'],
  },
  auditoria: {
    titulo: 'Auditoria',
    href: '/painel/admin/auditoria',
    resumo: 'Registro de tudo o que foi feito no painel e nos pagamentos: quem fez, quando, e o antes e depois.',
    sozinho: ['Tudo é gravado sozinho e não pode ser apagado pelo painel. As tarefas da madrugada também registram o que fizeram.'],
    voces: ['Consultar quando houver dúvida ("quem mudou o preço?") e baixar a planilha se precisar.'],
  },
} satisfies Record<string, Guia>

export type ChaveGuia = keyof typeof GUIAS

/** O que acontece quando o usuário pede algo: o caminho completo, ponta a ponta. */
export type Fluxo = { titulo: string; quem: string; sozinho: string[]; voces: string[]; onde: { rotulo: string; href: string } }

export const FLUXOS: Fluxo[] = [
  {
    titulo: 'Comércio se cadastra pelo app',
    quem: 'Lojista ou autônomo, em "Cadastrar meu negócio"',
    sozinho: [
      'O perfil entra no ar na hora e a conta vira "profissional".',
      'Se o teste grátis estiver ligado, ganha os dias do plano pago configurados.',
      'Só cai na fila de revisão se uma regra de segurança disparar, e aí vocês são notificados.',
    ],
    voces: ['Revisar só os sinalizados.', 'Se o cadastro ficar incompleto, ele aparece em Leads → Cadastro incompleto para vocês ajudarem.'],
    onde: { rotulo: 'Cadastros sinalizados', href: '/painel/admin/negocios-pendentes' },
  },
  {
    titulo: 'Dono assume um perfil importado ("Sou o dono")',
    quem: 'Dono de um comércio que vocês importaram',
    sozinho: ['Com WhatsApp no cadastro: o app gera um código e notifica vocês.', 'Código certo: o perfil passa a ser dele na hora.'],
    voces: ['Enviar o código no WhatsApp do comércio (1 toque) e marcar como enviado.', 'Sem telefone no cadastro: conferir e aprovar o pedido.'],
    onde: { rotulo: 'Reivindicações', href: '/painel/admin/reivindicacoes' },
  },
  {
    titulo: 'Dono pede para tirar o perfil do app',
    quem: 'Dono de perfil importado, pelo aviso laranja do perfil',
    sozinho: ['Vocês recebem notificação "Pedido para ocultar perfil".'],
    voces: ['Confirmar e ocultar (ou recusar). O perfil some das buscas.'],
    onde: { rotulo: 'Importar comércios', href: '/painel/admin/importar#ocultar' },
  },
  {
    titulo: 'Lojista assina um plano',
    quem: 'Lojista, em Painel → Plano e assinatura',
    sozinho: [
      'Paga no Mercado Pago; quando aprova, os recursos do plano liberam sozinhos.',
      'Cobrança mensal automática. Se falhar, tolerância e depois volta ao Gratuito.',
      'Cancelar ou trocar de plano é o próprio lojista que faz.',
    ],
    voces: ['Nada no dia a dia. Quem abandona o pagamento aparece em Leads → Abandonou o pagamento.'],
    onde: { rotulo: 'Assinaturas e pagamentos', href: '/painel/admin/assinaturas' },
  },
  {
    titulo: 'Lojista compra divulgação (banner, destaque, post)',
    quem: 'Lojista, em Painel → Divulgar',
    sozinho: ['Pagamento aprovado notifica vocês e o lojista.', 'Destaque na busca liga e desliga sozinho.'],
    voces: ['Banner e post: combinar a arte pelo WhatsApp, subir e pôr no ar com as datas.'],
    onde: { rotulo: 'Divulgação paga', href: '/painel/admin/divulgacao' },
  },
  {
    titulo: 'Morador pede orçamento',
    quem: 'Morador, em "Pedir orçamento"',
    sozinho: [
      'O pedido vai direto para os comércios escolhidos (ou para os da categoria, se o morador autorizar), que são avisados.',
      'Os comércios respondem e o morador escolhe a melhor resposta; o escolhido é avisado.',
    ],
    voces: ['Nada. Só entram se houver denúncia ou chamado de suporte.'],
    onde: { rotulo: 'Denúncias', href: '/painel/admin/denuncias' },
  },
  {
    titulo: 'Usuário esqueceu a senha',
    quem: 'Qualquer pessoa, em Entrar → Esqueci minha senha',
    sozinho: [
      'Pelo e-mail: o link de nova senha chega sozinho (vale 1 hora).',
      'Se o e-mail não chega, a pessoa toca em "Receber pelo WhatsApp". Vocês recebem notificação e o pedido aparece no topo do Suporte.',
      'O link só vai para o WhatsApp que já está na conta (perfil ou negócio). Ninguém consegue pedir para outro número.',
      'Abrir o link mostra o botão "Criar nova senha"; só ao tocar ele é usado (a prévia do WhatsApp não gasta o link).',
    ],
    voces: ['Tocar em "Gerar link e enviar no WhatsApp" e enviar a mensagem pronta.', 'Conta sem WhatsApp: pedir que a pessoa fale com vocês por outro canal e confirme quem é.'],
    onde: { rotulo: 'Chamados de suporte', href: '/painel/admin/suporte' },
  },
  {
    titulo: 'Usuário abre um chamado de suporte',
    quem: 'Qualquer pessoa com conta, em "Ajuda e suporte"',
    sozinho: ['Vocês recebem notificação. A pessoa é avisada quando vocês respondem.'],
    voces: ['Responder e marcar como resolvido.'],
    onde: { rotulo: 'Chamados de suporte', href: '/painel/admin/suporte' },
  },
  {
    titulo: 'Alguém denuncia um conteúdo',
    quem: 'Qualquer pessoa com conta',
    sozinho: ['Entra na fila e no cartão da Visão geral (sem notificação).'],
    voces: ['Remover ou arquivar. Suspender a conta se for abuso.'],
    onde: { rotulo: 'Denúncias', href: '/painel/admin/denuncias' },
  },
  {
    titulo: 'Morador sugere notícia ou evento',
    quem: 'Morador, em Notícias ou Agenda',
    sozinho: ['Vocês recebem notificação. Nada é publicado sem revisão.'],
    voces: ['Publicar ou descartar.'],
    onde: { rotulo: 'Notícias, eventos e serviços', href: '/painel/admin/conteudo' },
  },
  {
    titulo: 'Empresa quer divulgar uma vaga',
    quem: 'Lojista com perfil (sozinho) ou empresa de fora (pede a vocês)',
    sozinho: ['Lojista publica pelo próprio painel.'],
    voces: ['Quem não tem perfil: publicar por eles em Vagas.'],
    onde: { rotulo: 'Vagas', href: '/painel/admin/vagas' },
  },
  {
    titulo: 'Usuário exclui a conta',
    quem: 'Qualquer pessoa, em Perfil → Privacidade',
    sozinho: ['Apaga perfil, fotos e dados pessoais na hora. Pagamentos ficam guardados sem o nome da pessoa (obrigação fiscal).'],
    voces: ['Nada.'],
    onde: { rotulo: 'Auditoria', href: '/painel/admin/auditoria' },
  },
]

/** Tarefas que rodam sozinhas todo dia (vercel.json). */
export const ROTINAS = [
  { quando: 'Todo dia às 3h', oque: 'Confere assinaturas e compras no Mercado Pago, aplica tolerância e vencimentos, encerra destaques vencidos e limpa registros antigos.' },
  {
    quando: 'Todo dia às 8h',
    oque: 'Resumo do bairro para os moradores, lembrete de avaliar, lembrete de evento, resumo semanal dos lojistas e busca de notícias no RSS da Prefeitura.',
  },
]
