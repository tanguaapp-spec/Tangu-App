# Auditoria técnica — Tanguá App (out/2026)

Escopo: repositório inteiro (Next.js 14 App Router + Supabase), migrations 0001–0015,
server actions, páginas, CI e testes. Feita sem ler dados de produção: as falhas de
banco foram reproduzidas num Postgres embutido (PGlite) com as migrations reais
(`supabase/tests/diagnostico.test.ts`).

## 1. Stack confirmada

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14.2.35, App Router, Server Components + Server Actions, TypeScript 5.6 |
| Estilo | Tailwind 3.4, paleta própria (casca = laranja, mata = verde, barro = neutros), fontes Fraunces/Inter |
| Banco/Auth/Storage | Supabase (Postgres + PostGIS + pg_trgm), `@supabase/ssr` 0.12, bucket público `imagens` |
| PWA/Push | next-pwa 5, Web Push com VAPID (`web-push`) |
| Observabilidade | tabela `error_logs`, Sentry configurado mas desligado sem DSN, Vercel Analytics/Speed Insights |
| Testes | Vitest (10 testes unitários), Playwright E2E (rodam contra o Supabase de **produção** — não existe staging) |
| CI | GitHub Actions: lint, tsc, vitest, build |
| Deploy | Vercel (cron diário `/api/cron/resumo-diario`) |

Linha de base antes de qualquer mudança: `tsc` ok, `lint` ok, `vitest` 10/10, build ok.

## 2. O que já funciona (preservado)

Diretório com busca/filtros/paginação, perfil público do negócio, favoritos, avaliações com
foto e resposta do dono, catálogo de produtos com preço, novidades/promoções, cupons
"oferta relâmpago", vagas, mural (avisos, eventos, "pergunte à cidade", reações),
reivindicação de perfil importado, autocadastro de negócio, cartão fidelidade, pontos
"Laranjas", indicação, Web Push, resumo diário, denúncias, painel admin (pendentes,
reivindicações, denúncias, logs, prospecção Google), páginas de termos/privacidade,
rate limiting em Postgres, headers de segurança/CSP.

## 3. Falhas encontradas

### Críticas (abertas em produção)

1. **Escalada para administrador no cadastro.** `handle_novo_usuario()` copia
   `raw_user_meta_data.papel` para `perfis.papel` sem filtro. Qualquer pessoa chama
   `supabase.auth.signUp({ options: { data: { papel: 'admin' } } })` com a chave anon
   (pública) e vira admin. O trigger `perfis_protege_papel` só cobre UPDATE.
   Reproduzido em teste.
2. **Dados pessoais de todos os usuários legíveis anonimamente.** Policy
   `perfis_select_publico using (true)` expõe telefone, WhatsApp, bairro e código de
   convite de todo mundo para qualquer visitante. Reproduzido em teste. (LGPD.)
3. **XSS armazenado via link do site do negócio.** `negocios.site` não é validado e é
   renderizado como `<a href>`; um `javascript:` executa (a CSP permite inline).

### Altas

4. Dono do negócio podia alterar **nota e comentário** de avaliações recebidas (a policy
   de update libera a linha inteira). Reproduzido em teste.
5. `registrarEventoPerfil` é exportado de um arquivo `'use server'` → vira endpoint
   público: qualquer um infla visualizações/favoritos/cliques de qualquer negócio.
   Visualização também é contada a cada render, inclusive bots e o próprio dono.
6. Upload: qualquer usuário autenticado grava qualquer arquivo em qualquer caminho do
   bucket `imagens`; validação só pelo `Content-Type` declarado pelo navegador.
7. Qualquer usuário cria vaga vinculada a negócio de terceiros (`vagas.negocio_id` sem
   checagem de dono).
8. `registrarErroCliente` sem autenticação nem rate limit (enche `error_logs`).
9. Exclusão de conta é impossível hoje: várias FKs para `perfis` sem `on delete`
   (negócios, posts, vagas, avisos, revisões) bloqueiam o delete.

### Médias / produto

10. Todo autocadastro exige aprovação manual do admin (contraria o self-service).
    Aprovação marca `verificado = true` sem verificação real.
11. Sem planos, assinaturas, pagamentos, limites, auditoria, configurações globais,
    central de ajuda, chamados, exportação/exclusão de dados, onboarding guiado.
12. Profissional autônomo usa o mesmo fluxo de loja física (endereço sugerido).
13. Perfil do negócio sem `generateMetadata`/Open Graph/JSON-LD; `robots.txt` não
    bloqueia `/painel`.
14. Admin identificado por `perfis.papel`, coluna editável pela própria pessoa
    (protegida só por trigger) — sem registro de quem concedeu.
15. `.env` local tem espaço/CR no fim de `NEXT_PUBLIC_SUPABASE_URL` (quebra scripts
    Node locais; a Vercel usa variáveis próprias).
16. Testes E2E escrevem no banco de produção.

## 4. Plano executado (por prioridade de risco)

| Fase | Entrega | Migration |
|---|---|---|
| B0 hotfix | Itens 1–4, 6, 7, 9 + admin em tabela própria | `0016_hotfix_seguranca.sql` |
| B | Planos, assinaturas, pagamentos, webhooks, auditoria, configurações, limites no banco, autoaprovação com regras de risco, perfil autônomo | `0017_saas_fundacao.sql` |
| D/E | Onboarding com checklist real, fluxo autônomo, autoaprovação | — |
| G | Mercado Pago (assinatura `preapproval`), webhook com assinatura HMAC + idempotência, reconciliação por cron | — |
| H | Painel do proprietário (crescimento, receita, saúde, moderação, planos, configurações, auditoria) | — |
| 13/18 | Central de ajuda, chamados, exportação e exclusão de conta | `0018_suporte_lgpd.sql` |
| 22 | SEO do perfil público, robots | — |

O que fica fora desta rodada está listado em `docs/PENDENCIAS.md`.
