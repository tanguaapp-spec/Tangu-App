# Tanguá App 🍊

Plataforma local de Tanguá-RJ: moradores encontram comércios, profissionais, ofertas, vagas e o
mural da cidade; lojistas e autônomos criam e administram o próprio perfil, catálogo, ofertas,
orçamentos e assinatura — sem depender do dono da plataforma. O dono acompanha tudo por um painel.

**Stack:** Next.js 14 (App Router, Server Actions) · Supabase (Postgres + Auth + Storage, RLS) ·
Tailwind · Vercel · Mercado Pago (assinaturas) · Web Push.

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | estrutura, papéis, RLS, planos, métricas, notificações, testes |
| [docs/DEPLOY.md](docs/DEPLOY.md) | **ordem de aplicação das migrations**, variáveis, Supabase Auth, Mercado Pago, cron, rollback, incidentes |
| [docs/PAGAMENTOS.md](docs/PAGAMENTOS.md) | fluxo de assinatura, webhook, estados, reconciliação |
| [docs/PENDENCIAS.md](docs/PENDENCIAS.md) | o que falta e o que depende de configuração externa |
| [docs/AUDITORIA-2026-10.md](docs/AUDITORIA-2026-10.md) | diagnóstico que originou a rodada SaaS |
| [e2e/README.md](e2e/README.md) | testes end-to-end |

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do Supabase (de um projeto de DESENVOLVIMENTO)
npm run dev                  # http://localhost:3000
npm test                     # unitários + RLS (Postgres embutido, não toca em nenhum banco real)
```

## Banco de dados

Migrations em `supabase/migrations/`, aplicadas **em ordem** no SQL Editor do Supabase (todas
idempotentes). Depois de aplicar, confira com `supabase/verificacao/pos-migracao.sql`.

### Administrador da plataforma

Admin **não** é definido por campo editável no app. Depois de criar sua conta pelo próprio app,
rode no SQL Editor:

```sql
select public.conceder_admin('seu-email@exemplo.com', 'dono da plataforma');
-- para remover: select public.revogar_admin('email@exemplo.com');
```

Toda concessão fica registrada em `registros_auditoria`.

## Importação do Google Places

`npm run seed:places` — leia o aviso legal no topo de `scripts/importar-google-places.ts` antes de usar
em produção (os Termos do Google restringem armazenamento de alguns campos). A prospecção privada
(`/painel/admin/prospeccao`) não publica nada no diretório.

## Deploy

Vercel com Framework Preset **Next.js**. Variáveis e passos em [docs/DEPLOY.md](docs/DEPLOY.md).
Nunca exponha `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN` ou `VAPID_PRIVATE_KEY` com
prefixo `NEXT_PUBLIC_`.
