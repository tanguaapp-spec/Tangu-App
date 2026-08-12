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

## Etapa 5 — Incidente: site fora do ar na Vercel (MIDDLEWARE_INVOCATION_FAILED)
- **O que aconteceu:** depois do deploy inicial, todo o site (praticamente todas as rotas —
  o matcher do middleware cobria quase tudo) começou a retornar 500 com
  `MIDDLEWARE_INVOCATION_FAILED` / `ReferenceError: __dirname is not defined` (antes disso,
  ainda mais cedo, `process is not defined`). Só acontecia no ambiente real da Vercel — nunca
  reproduziu em build local nem em `next start` local (Windows).
- **Tentativas que NÃO resolveram** (documentado pra não repetir o mesmo caminho):
  1. Atualizar `@supabase/ssr`/`@supabase/supabase-js` e migrar pro padrão `getAll`/`setAll`.
  2. Trocar o `import` estático de `@supabase/ssr` por `import()` dinâmico dentro de try/catch.
  3. Redeploy sem build cache na Vercel (descartou cache corrompido como causa).
- **Causa mais provável:** Edge Functions são empacotadas como arquivo único autocontido — o
  código de qualquer módulo importado (estático ou dinâmico) parece ser avaliado já na carga
  inicial do bundle, então nem try/catch em volta de um `import()` protege contra uma
  incompatibilidade de uma dependência transitiva com o Edge Runtime. Não foi possível
  confirmar a dependência exata culpada (não aparece em nenhum grep do bundle local).
- **Correção aplicada:** removido `middleware.ts` por completo. O controle de acesso real
  sempre esteve nas páginas/layouts (`app/painel/layout.tsx`, `lib/auth/require-admin.ts`),
  que já chamam `getUser()` no servidor e redirecionam — então isso não abre brecha de
  segurança. O que se perde é só o refresh proativo do cookie de sessão a cada navegação
  (nice-to-have de UX, não controle de acesso); o token ainda renova via cliente no browser
  e via `getUser()` nas páginas.
- [ ] Também atualizado Next.js 14.2.18 → 14.2.35 (corrige CVE de DoS — GHSA-mwv6-3258-q52c/
      CVE-2025-55184 — não relacionado ao crash do middleware, mas era vulnerabilidade real).
- [ ] Se algum dia quiser reintroduzir refresh de sessão via middleware: testar antes num
      preview deployment real da Vercel (não só local) antes de promover pra produção.
- [x] **Causa raiz real, achada depois**: em Project Settings → Build and Deployment na Vercel,
      o **Framework Preset estava em "Other"**, não "Next.js". Sem o preset certo, a Vercel não
      usa o runtime dela pra Next.js (Edge Middleware, rotas dinâmicas, etc.) — isso explica tanto
      o crash do middleware quanto o 404 generalizado que apareceu depois de eu removê-lo. Nenhuma
      mudança de código teria resolvido isso. Corrigido trocando o preset pra "Next.js" + redeploy.
      O `middleware.ts` continua removido (não tinha função de segurança, só nice-to-have de UX) —
      pode ser reavaliado depois com o preset certo, mas não é urgente.

## Etapa 6 — Bug: "Database error saving new user" no cadastro
- **Causa (confirmada no Postgres Logs do Supabase):** `type "user_role" does not exist`
  (código 42704). A trigger `handle_novo_usuario()` (migration 0001) faz `(...)::user_role`
  sem qualificar o schema; funções `SECURITY DEFINER` rodam com `search_path` restrito por
  padrão de segurança do Postgres/Supabase, então não acha o tipo (que vive em `public`).
  Bug pré-existente da migration 0001, só nunca tinha sido testado nesse projeto novo.
- [x] **Migration 0003** (`supabase/migrations/0003_fix_search_path_trigger_cadastro.sql`) —
      corrige qualificando `public.user_role` e fixa `search_path = public` em todas as
      funções `SECURITY DEFINER` do projeto (blindagem contra essa classe de bug voltar).
      **Depende da 0002 já ter rodado** (referencia colunas que ela cria).
