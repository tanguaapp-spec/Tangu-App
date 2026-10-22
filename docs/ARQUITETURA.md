# Arquitetura — Tanguá App

Next.js 14 (App Router, Server Components, Server Actions) + Supabase (Postgres, Auth, Storage) na
Vercel. Sem backend separado: regras sensíveis vivem **no banco** (RLS, triggers, funções
`security definer`) e em Server Actions que rodam só no servidor.

## Diretórios

```
app/
  (public)/            páginas com cabeçalho/rodapé: home, busca, negócio, planos, ajuda,
                       orçamentos, notificações, perfil, bem-vindo, termos, privacidade
  (auth)/              entrar, cadastrar, esqueci-senha, redefinir-senha
  auth/callback/       troca o code do e-mail (PKCE) por sessão
  painel/negocio/      painel do lojista/profissional (+ assinatura, orçamentos)
  painel/admin/        painel do proprietário (layout.tsx exige eh_admin())
  api/webhooks/        Mercado Pago
  api/cron/            resumo diário, manutenção de assinaturas
  api/conta/exportar   portabilidade LGPD
  api/admin/           exportação CSV da auditoria
components/            UI por domínio (negocio, painel, planos, ajuda, home, perfil, ui…)
lib/
  actions/             Server Actions (escrita). Arquivos 'use server' só exportam funções async.
  queries/             leituras
  pagamentos/          cliente MP, HMAC do webhook, máquina de estados, processador
  planos/ ofertas/ onboarding/ ajuda/ admin/   regras puras (testadas)
  metricas/            registro de eventos deduplicado (NÃO é 'use server' de propósito)
  notificacoes/        notificar(): sino do app + push, respeitando preferências
  auth/                verificarAdmin / requireAdminOrRedirect
supabase/migrations/   SQL versionado, idempotente, aplicado no SQL Editor em ordem
supabase/tests/        testes de RLS/trigger com PGlite (Postgres embutido)
supabase/verificacao/  SQL somente leitura pra conferir produção
e2e/                   Playwright
docs/                  auditoria, deploy, pagamentos, pendências
```

## Papéis e permissões

| Papel | Como se obtém | Onde é checado |
|---|---|---|
| Visitante | — | RLS (`anon`) |
| Morador | cadastro | RLS (`auth.uid()`) |
| Dono de negócio | cadastrar ou ter reivindicação aprovada (`negocios.reivindicado_por`) | `eh_dono_negocio()` em RLS + `.eq('reivindicado_por', user.id)` nas actions |
| Admin da plataforma | `select conceder_admin('email')` no SQL Editor | `eh_admin()` (tabela `administradores_plataforma`, sem caminho de escrita pela API) |

`perfis.papel` é só rótulo de UI (morador/profissional). O valor `admin` ali não concede nada.
Um negócio tem um dono; membros/colaboradores por negócio ainda não existem (ver pendências).

## Segurança de dados (resumo do RLS)

- **perfis**: linha visível só para o próprio, admin, autores de avaliação (nome público) e quem
  favoritou um negócio seu (para o dono). Colunas expostas pela API: `id, nome_completo,
  avatar_url, criado_em`. Perfil completo do próprio usuário: RPC `meu_perfil()`.
- **negocios/produtos/posts/cupons**: leitura pública só de aprovados/ativos; escrita só do dono.
  Trigger impede o dono de mexer em verificado, destaque, status de moderação, origem, dono.
- **avaliacoes**: autor edita conteúdo; dono do negócio só a resposta; ninguém avalia o próprio negócio.
- **assinaturas, pagamentos, eventos_webhook, registros_auditoria, configuracoes_sistema, planos,
  notificacoes, cupom_resgates, pedido_destinatarios**: sem INSERT/UPDATE/DELETE para `anon` e
  `authenticated` (revogado). Escrita só pelo servidor (service role) ou por função `security definer`
  com checagem própria (`resgatar_cupom`, `validar_codigo_cupom`, `uso_plano`).
- **storage `imagens`**: 5 MB, só JPEG/PNG/WebP/GIF; escrita em `negocios/<id>/` só pelo dono e em
  `usuarios/<uid>/` só pelo próprio. O app ainda confere a assinatura binária do arquivo e gera o nome.
- Funções internas (`verificar_rate_limit`, `conceder_admin`, `revogar_admin`) sem EXECUTE para a API.

Cobertura em `supabase/tests/*.test.ts` (inclui cenários "dono A tenta mexer no negócio B").

## Planos e limites

Planos, preços, limites (`max_produtos`, `max_cupons_ativos`, `max_posts_mes`, `max_fotos_galeria`;
`null` = ilimitado) e recursos (`estatisticas_avancadas`, `destaque_busca`) ficam na tabela `planos`,
editáveis em `/painel/admin/planos`. O banco aplica os limites por trigger e devolve
`LIMITE_PLANO:<chave>`, traduzido para o usuário por `traduzirErroBanco`. Detalhes de cobrança em
`PAGAMENTOS.md`.

## Self-service

- **Cadastro de negócio**: aprovado na hora. `negocios_status_inicial()` segura para revisão quando:
  moderação prévia ligada, conta com cadastro recusado antes, termo sinalizado, ou volume anormal
  por hora. Motivo interno em `motivo_moderacao`.
- **Onboarding**: checklist calculado dos dados reais (`lib/onboarding/checklist-negocio.ts`);
  assistente opcional do morador em `/bem-vindo`.
- **Ajuda**: artigos versionados em `lib/ajuda/artigos.ts` (sem preços fixos); o formulário de
  chamado sugere artigos antes do envio.
- **Conta**: recuperar senha, preferências de comunicação, exportar dados, excluir conta (com senha).

## Métricas (definições)

- **Visualização**: perfil aberto por visitante distinto, no máximo 1 a cada 6h por visitante; não
  conta o dono nem user-agents de robôs. Visitante = usuário logado ou `sha256(sal|IP|UA)`.
- **Clique no WhatsApp**: no máximo 1 por hora por visitante.
- **Favorito**: só a primeira vez de cada pessoa.
- Escrita só pelo servidor (`lib/metricas/eventos-perfil.ts`); a API não aceita insert em `eventos_perfil`.
- **Populares** (home): mais visitantes distintos em 30 dias, mínimo 3.
- Painel do proprietário: receita **confirmada** (pagamentos aprovados) ≠ **MRR estimado**
  (assinaturas ativas) ≠ **pendente**.

## Notificações

`notificar(perfilIds, {tipo, titulo, corpo, url}, {categoria})` grava no sino (`notificacoes`) e
manda Web Push. Categorias opcionais (`novidades_favoritos`, `ofertas_favoritos`, `mural`) respeitam
`perfis.preferencias_notificacao`; avisos de conta (pagamento, suporte, moderação, orçamento) são
essenciais. Mural vai só por push (não multiplica linhas no banco).

## Testes

| Comando | O quê |
|---|---|
| `npm test` | unitários + banco (PGlite com as migrations reais) |
| `npm run test:db` | só os testes de banco |
| `npm run test:e2e` | Playwright — **rodar contra staging** (cria dados) |

O harness (`supabase/tests/harness.ts`) simula `auth`, `storage` e os papéis do Supabase; PostGIS é
substituído por `text`. Valida SQL/RLS, não o comportamento HTTP do PostgREST.
