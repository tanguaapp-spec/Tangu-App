# Testes E2E (Playwright)

Roda contra o **app de verdade** (build de produção local) e o **mesmo banco Supabase de
produção** — não existe ambiente de staging separado. Por isso:

- Todo dado criado por um teste usa e-mails `@tangua-app-teste.dev` (nunca recebe e-mail de
  verdade) e nomes de negócio prefixados com `[TESTE-E2E]`.
- Usuários de teste são criados via Admin API (`e2e/helpers/usuarios-teste.ts`, já confirmados)
  e removidos ao final de cada teste (`removerUsuarioTeste`), então não acumulam lixo no banco.
- A massa de dados "de demonstração" (10 profissionais + 3 moradores, usada no relatório final)
  é gerada por `scripts/testes/gerar-massa-teste.ts` — separada dos specs, não é apagada
  automaticamente (fica marcada com `[TESTE]` até decisão do time).

## Como rodar

```bash
npm run build
npm run start -- -p 3100   # em outro terminal, ou via `next start -p 3100`
npm run test:e2e           # roda mobile + desktop
npm run test:e2e:ui        # modo interativo
```

Requer `.env` com `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (mesmos usados pelo
app) — são lidos via `dotenv` em `playwright.config.ts`.

## Organização

- `helpers/supabase-admin.ts` — cliente service-role só pra uso em Node (nunca no browser).
- `helpers/usuarios-teste.ts` — cria/remove usuários de teste confirmados via Admin API.
- `helpers/ui.ts` — ações repetidas pela UI (login).
- `*.spec.ts` — um arquivo por fluxo. Novos specs entram conforme cada fase (A/B/C) do roadmap
  de retenção é implementada.
