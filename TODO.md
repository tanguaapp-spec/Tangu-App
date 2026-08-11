# TODO — cidade-conecta

## Etapa 1 — WhatsApp no fluxo de “Reivindicar o perfil”
- [x] Atualizar `components/negocio/botao-reivindicar.tsx` para incluir botão “Avisar no WhatsApp” (telefone: 21972652314) quando a solicitação for enviada (ou logo antes de enviar).
- [x] Gerar mensagem pré-preenchida com dados mínimos (ex: “solicitação de reivindicação enviada”, negocioId e mensagem do morador/profissional).
- [x] Validar que o botão abre WhatsApp com link `https://wa.me/21972652314?...`.

## Etapa 2 — Painel admin: segurança/UX/erros/paginação
- [x] Corrigir `lib/actions/admin-actions.ts` para verificar `{ error }` também em `aprovarReivindicacao` e `rejeitarReivindicacao`.
- [x] Atualizar `components/painel/acoes-reivindicacao.tsx` para tratar retorno `{ erro }` e exibir feedback (sucesso/erro).
- [ ] Atualizar `components/painel/botao-encerrar-vaga.tsx` e `components/painel/botao-remover-aviso.tsx`:
  - [x] tratar `{ erro }`
  - [x] adicionar modal de confirmação para ações destrutivas.
- [x] Proteger server-side as páginas:
  - [x] `app/painel/admin/reivindicacoes/page.tsx`
  - [x] `app/painel/admin/vagas/page.tsx`
  - [x] `app/painel/admin/avisos/page.tsx`
- [ ] Adicionar paginação/limite nas listagens:
  - [x] `app/painel/admin/vagas/page.tsx` (limit + order)
  - [x] `app/painel/admin/avisos/page.tsx` (limit + order)
  - [x] `app/painel/admin/reivindicacoes/page.tsx` (limit)

## Etapa 3 — Validação final
- [x] Rodar build/lint e revisar fluxos manuais principais.
  - `npm run build` passa limpo.
  - ESLint configurado (`.eslintrc.json` + `eslint`/`eslint-config-next` como devDependency) — `npm run lint` sem warnings.
  - Corrigido crash em `app/painel/negocio/page.tsx` (usava `user!.id` sem checar sessão nula).
  - Projeto Supabase antigo (`tjrhaavnzgiycsawplqt`) não existia mais (DNS NXDOMAIN); usuário migrou para um novo projeto e rodou a migration — conexão validada (categorias seedadas, negócios/vagas/avisos consultando OK).

## Etapa 4 — Roadmap "Tanguá, a cidade conectada" (profissionais + população)
- [x] **Migration 0002** (`supabase/migrations/0002_autocadastro_e_seguranca.sql`) — precisa ser rodada
      no SQL Editor do Supabase antes de usar as funcionalidades abaixo em produção:
  - Coluna `status_cadastro` (pendente/aprovado/rejeitado) + `motivo_rejeicao` em `negocios`.
  - RLS: profissional pode inserir o próprio negócio (nasce `pendente`, sem selos/destaque).
  - Trigger `negocios_protege_campos_admin`: só admin altera verificado/destaque/status_cadastro/
    origem/dados do Google — fecha brecha de o dono se autopromover via API direta.
  - Trigger `perfis_protege_papel`: só admin promove alguém a `admin` — fecha brecha de
    auto-promoção via update direto em `perfis` (a policy antiga não restringia colunas).
  - Bucket de Storage `imagens` (público) + políticas de leitura pública / escrita pelo dono.
- [x] Autocadastro de negócio (`/painel/negocio/cadastrar`) — profissional sem Google Places
      (inclusive autônomos) cadastra o próprio negócio, entra como "pendente" até aprovação.
- [x] Moderação de cadastros pendentes (`/painel/admin/negocios-pendentes`) — aprovar/rejeitar
      com motivo, reenvio pelo profissional após ajuste.
- [x] Perfil de negócio rico: categoria, bairro, telefone, horário de funcionamento por dia,
      formas de pagamento, toggle "aberto agora", upload de foto de capa e galeria (Storage).
- [x] Página pública do negócio exibe galeria, formas de pagamento e status aberto/fechado.
- [x] Cartão de divulgação no painel: link público + QR code pra baixar, compartilhar no WhatsApp.
- [x] Profissional publica e encerra vagas do próprio negócio direto do painel (antes só admin).
- [x] Dashboard do profissional: nota média + total de avaliações, além de views/cliques.
- [ ] Próximos passos sugeridos (não implementados ainda, ficam pro próximo ciclo):
  - Geração automática de artes de divulgação (Adobe Express) pro profissional baixar.
  - Gráfico de evolução de métricas ao longo do tempo (hoje são só números atuais).
  - Ativar de fato destaque pago / plano verificado pago (schema já suporta, ligado a "desligado").
