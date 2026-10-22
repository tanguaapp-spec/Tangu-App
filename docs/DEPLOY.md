# Deploy e configuração — rodada SaaS (migrations 0016–0019)

> **Ordem obrigatória: banco primeiro, código depois.** O código novo lê o próprio perfil por
> `meu_perfil()`, checa admin por `eh_admin()` e usa tabelas novas. Publicar o código antes das
> migrations quebra login de perfil e o painel.

## 0. Antes de começar

1. **Backup**: Supabase → Database → Backups (plano pago) ou, no mínimo, exporte as tabelas
   principais (Table Editor → Export CSV) de `perfis`, `negocios`, `avaliacoes`.
2. Confira que as migrations 0001–0015 estão aplicadas (o build atual de produção depende delas).

## 1. Hotfix de segurança (aplicar já, mesmo sem o resto)

A 0016 fecha uma brecha **aberta hoje em produção**: qualquer pessoa consegue virar administradora
mandando `papel: "admin"` no cadastro (a chave anon é pública). Ela também tira telefone/WhatsApp
de todos os usuários da leitura anônima.

1. SQL Editor → cole `supabase/migrations/0016_hotfix_seguranca.sql` → Run.
2. Rode os blocos 1 e 1b de `supabase/verificacao/pos-migracao.sql`. **Se houver admin que você não
   reconhece**, revogue: `select public.revogar_admin('email@exemplo.com');` e investigue o que essa
   conta fez (tabelas `avisos_cidade`, `negocios`, `denuncias`, `solicitacoes_reivindicacao`).
3. Para dar admin a alguém daqui pra frente (nunca pelo app):
   ```sql
   select public.conceder_admin('seu-email@exemplo.com', 'dono da plataforma');
   ```

> ⚠️ A 0016 sozinha, com o código antigo no ar, causa degradação até o deploy do código novo
> (o código antigo lê `perfis` direto): o cabeçalho fica sem o nome do usuário, `/perfil` volta pra
> tela de entrar e **o painel admin antigo fica inacessível** (ele checava `perfis.papel`). Cadastro,
> busca, perfis de negócio e painel do lojista continuam funcionando. É uma troca aceitável por poucas
> horas para fechar a brecha — aplique as demais migrations e publique o código em seguida.

## 2. Demais migrations (em ordem, uma por vez)

| Arquivo | O que faz |
|---|---|
| `0017_saas_fundacao.sql` | configurações, auditoria, planos, assinaturas, pagamentos, webhooks, limites por trigger, autoaprovação, perfil autônomo |
| `0018_suporte_notificacoes_lgpd.sql` | chamados de suporte, notificações no app, preferências de comunicação, denúncia de negócio/post |
| `0019_cupons_resgate_e_orcamentos.sql` | cupom com código/limite/QR (resgate atômico), pedidos de orçamento |

Depois de cada uma, rode `supabase/verificacao/pos-migracao.sql` (blocos 2–7).

Todas são idempotentes (podem ser executadas de novo sem estragar nada) e **não apagam dados**.
A 0016 muda FKs para `ON DELETE SET NULL` e torna `posts_negocio.autor_id`, `vagas.publicado_por`,
`avisos_cidade.publicado_por` anuláveis — necessário pra exclusão de conta (LGPD).

## 3. Variáveis de ambiente na Vercel

| Variável | Obrigatória | Para quê |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | já existem |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | já existe. Nunca com prefixo `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | sim | ex.: `https://tangua-app.vercel.app` — links de e-mail e retorno do pagamento (não confia no header Host) |
| `CRON_SECRET` | sim | protege `/api/cron/*` (a Vercel envia automaticamente nos Cron Jobs) |
| `METRICAS_SAL` | recomendada | texto aleatório longo; deixa o hash de visitante impossível de reverter por dicionário |
| `MERCADOPAGO_ACCESS_TOKEN` | p/ planos pagos | Suas integrações → aplicação → Credenciais de **produção** |
| `MERCADOPAGO_WEBHOOK_SECRET` | p/ planos pagos | Suas integrações → aplicação → Webhooks → "Assinatura secreta" |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | p/ push | já documentadas |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` | opcional | alertas de erro |

Sem `MERCADOPAGO_*` o app funciona normalmente: os planos aparecem, mas a contratação mostra
"ainda não disponível" e o painel do proprietário mostra a integração como não configurada.

**Nunca** adicione `E2E_RATE_LIMIT_BYPASS` na Vercel.

## 4. Supabase Auth

Authentication → URL Configuration:
- **Site URL**: o mesmo de `NEXT_PUBLIC_SITE_URL`.
- **Redirect URLs**: adicione `https://SEU-DOMINIO/auth/callback` (e o de preview, se usar).

Authentication → Providers → Email: senha mínima **8** (o app já exige 8 em novos cadastros).

Templates de e-mail (`scripts/email-*.html`) continuam usando `{{ .ConfirmationURL }}` — nada muda.

## 5. Mercado Pago

1. Crie uma aplicação em https://www.mercadopago.com.br/developers/panel (produto: Assinaturas).
2. Webhooks → URL de produção: `https://SEU-DOMINIO/api/webhooks/mercadopago` → eventos
   **Planos e assinaturas** (`subscription_preapproval`, `subscription_authorized_payment`) e
   **Pagamentos** (`payment`). Copie a assinatura secreta para `MERCADOPAGO_WEBHOOK_SECRET`.
3. **Teste antes** com credenciais de teste e usuários de teste (comprador e vendedor de teste do
   próprio painel): o e-mail da conta no Tanguá App usada para assinar precisa ser o do comprador de
   teste. Confira em /painel/admin/assinaturas que o webhook chegou com "assinatura HMAC: válida".
4. Detalhes e decisões em `docs/PAGAMENTOS.md`.

## 6. Cron Jobs (vercel.json)

- `/api/cron/resumo-diario` — 11:00 UTC (já existia).
- `/api/cron/assinaturas` — 06:00 UTC: reconcilia com o MP, expira planos vencidos, tira destaque
  vencido, reprocessa webhooks falhos, limpa rate limit e aplica a retenção de logs (90 dias) e
  notificações (180 dias). O painel do proprietário alerta se ficar mais de 26h sem rodar.

## 7. Publicar

Merge/push para `main` → a Vercel faz o deploy (Framework Preset precisa estar em **Next.js** —
ver TODO.md, Etapa 5).

## 8. Conferência depois do deploy (5 minutos)

- [ ] Entrar como admin → `/painel/admin` carrega e "Integrações" mostra o esperado.
- [ ] Conta comum → `/painel/admin` redireciona para a home.
- [ ] `/perfil` carrega; "Baixar meus dados" baixa um JSON.
- [ ] Cadastrar negócio de teste (autônomo) → entra no ar na hora; checklist aparece.
- [ ] `/planos` mostra os 3 planos com os limites do banco.
- [ ] `/ajuda` busca "senha" e acha o artigo.
- [ ] Abrir um chamado → aparece em `/painel/admin/suporte`.
- [ ] (com MP) assinar com comprador de teste → ver o plano ativar só depois do pagamento.

## 9. Rollback

- **Código**: Vercel → Deployments → deployment anterior → *Promote to Production*. Lembre: o código
  antigo não conhece `meu_perfil()`/tabelas novas, mas também não quebra com elas (só fica sem as
  funções novas), **exceto** o que a 0016 restringiu (leitura de `perfis` pelo cliente).
- **Banco**: as migrations não apagam dados. Desfazer a 0016 reabre as brechas — não recomendado.
  Se for indispensável restaurar a leitura de `perfis` pelo código antigo, o mínimo é:
  `grant select on public.perfis to authenticated;` (temporário, reexpõe telefones a usuários logados).
- **Pagamentos**: nunca apague linhas de `assinaturas`/`pagamentos`/`eventos_webhook` — são a
  trilha financeira. Para parar cobranças, cancele no painel do Mercado Pago.

## 10. Incidente

1. Erro em massa: `/painel/admin` (Saúde) e `/painel/admin/logs`; Vercel → Logs.
2. Suspeita de fraude em pagamento: `/painel/admin/assinaturas#webhooks` (assinaturas inválidas) e
   `registros_auditoria` filtrando `assinatura`.
3. Vazamento de chave: gire a `service_role` (Supabase → API → Reset), o token do Mercado Pago e o
   `CRON_SECRET`; atualize na Vercel e faça redeploy.
4. Registre o ocorrido (o que, quando, quem foi afetado). Se houver dado pessoal exposto, avalie a
   comunicação à ANPD e aos titulares (LGPD art. 48) com apoio jurídico.
