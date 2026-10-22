# Pendências reais (out/2026)

O que **não** foi feito nesta rodada, ou foi feito mas ainda depende de algo externo. Nada aqui
está simulado no código.

## Depende de ação externa

| Item | O que falta | Quem |
|---|---|---|
| Migrations 0016–0019 em produção | Aplicar no SQL Editor, na ordem (`docs/DEPLOY.md`) | dono |
| Conferir admins após a 0016 | Rodar `supabase/verificacao/pos-migracao.sql` bloco 1 | dono |
| Teste ponta a ponta de cobrança | Credenciais de produção **validadas em 22/10/2026** (`npx tsx scripts/testar-mercadopago.ts`: token, criar/ler/cancelar assinatura, HMAC, rota publicada). Falta 1 pagamento real aprovado chegando pelo webhook (ver docs/PAGAMENTOS.md, "Primeira cobrança real") | dono |
| `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, `METRICAS_SAL` na Vercel | Cadastrar | dono |
| Redirect URL `/auth/callback` no Supabase Auth | Cadastrar | dono |
| Ambiente de staging | Segundo projeto Supabase pra rodar E2E sem tocar produção | dono |
| Validação jurídica | Política de privacidade, termos, retenção de pagamentos, regras de cupom (CDC), tratamento de menores | advogado(a) |
| Sentry | DSN (opcional) | dono |

## Não implementado (próximas rodadas, por prioridade)

1. ~~Redesign visual~~ — feito (identidade "Tanguá", claro/escuro; `docs/MARCA.md`). Falta só
   revisar com dados reais as telas logadas (painel, admin, perfil), que a auditoria automática não
   alcança sem um banco de staging.
2. **Membros por negócio** (gerente/colaborador com papéis). Hoje: um dono por negócio, um negócio
   por conta.
3. **Edição/arquivamento de produtos e posts** (hoje: criar e remover produto; posts só criar).
   Rascunhos de post, curtidas/salvos, imagem/vídeo em post.
4. **Favoritar produtos e salvar eventos** (hoje: favoritar negócios).
5. **Estatísticas avançadas por plano**: o recurso `estatisticas_avancadas` existe no plano mas o
   painel mostra o mesmo comparativo semanal para todos. Gráfico 30/90 dias pendente.
6. **Cobrança proporcional** em upgrade (decisão comercial — `docs/PAGAMENTOS.md`).
7. **Atualizar cartão sem sair do app**: hoje o lojista é orientado a atualizar no Mercado Pago.
8. **Notificação por e-mail** (avisos de cobrança, resposta de suporte). Hoje: sino do app + push.
9. **Geolocalização/mapa** na busca (o schema tem PostGIS; não há coleta de localização — de propósito).
10. **Testes E2E** dos fluxos de cupom com código e de orçamento (specs dos outros fluxos novos em
    `e2e/saas-self-service.spec.ts`, ainda não executados — exigem staging).
11. **Thumbnails/otimização de imagem no upload** (hoje: `next/image` otimiza na entrega; o arquivo
    original fica no bucket).
12. **Middleware de sessão** (refresh proativo do cookie). Removido no passado por incidente; reavaliar
    com o preset Next.js correto na Vercel.
13. Paginação nas listas do painel do lojista (produtos/posts/avaliações carregam tudo do negócio —
    ok no volume atual).

## Riscos conhecidos aceitos

- Métricas do painel do proprietário e "populares" leem linhas e agregam em memória (até milhares de
  linhas). Adequado ao volume de uma cidade; migrar para views/materialized views se crescer.
- `rate_limits` cresce com o dedup de métricas; o cron diário limpa janelas com mais de 2 dias.
- CSP ainda com `'unsafe-inline'` em script (motivo documentado em `next.config.js`).
