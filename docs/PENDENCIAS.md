# Pendências reais (out/2026)

O que **não** foi feito nesta rodada, ou foi feito mas ainda depende de algo externo. Nada aqui
está simulado no código.

## Depende de ação externa

| Item | O que falta | Quem |
|---|---|---|
| Migrations 0016–0020 em produção | Aplicar no SQL Editor, na ordem (`docs/DEPLOY.md`). **A 0020 precisa rodar antes do deploy do app novo** (slug, nota média, equipe, cortesias, lembretes) | dono |
| Migrations 0021 e 0022 | Rodar no SQL Editor (logs do admin; notificações sem conta). Sem a 0022, visitante sem conta vê "Entre na sua conta pra ativar" | dono |
| SMTP próprio no Supabase Auth | O e-mail embutido do Supabase manda poucos e-mails de confirmação por hora; cadastros novos falham em dias de movimento. Configurar Resend em Authentication → SMTP | dono |
| Conferir a 0020 | Rodar `supabase/verificacao/pos-migracao.sql` bloco 8 | dono |
| E-mail (opcional) | `RESEND_API_KEY` e `EMAIL_REMETENTE` com domínio verificado no Resend | dono |
| Conferir admins após a 0016 | Rodar `supabase/verificacao/pos-migracao.sql` bloco 1 | dono |
| Teste ponta a ponta de cobrança | Credenciais de produção **validadas em 22/10/2026** (`npx tsx scripts/testar-mercadopago.ts`: token, criar/ler/cancelar assinatura, HMAC, rota publicada). Falta 1 pagamento real aprovado chegando pelo webhook (ver docs/PAGAMENTOS.md, "Primeira cobrança real") | dono |
| `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, `METRICAS_SAL` na Vercel | Cadastrar | dono |
| Redirect URL `/auth/callback` no Supabase Auth | Cadastrar | dono |
| Ambiente de staging | Segundo projeto Supabase pra rodar E2E sem tocar produção | dono |
| Validação jurídica | Política de privacidade, termos, retenção de pagamentos, regras de cupom (CDC), tratamento de menores | advogado(a) |
| Sentry | DSN (opcional) | dono |

## Feito na rodada "app completo" (23/10/2026)

Interface refeita seguindo o protótipo (celular primeiro): barra inferior Início/Explorar/Ofertas/
Orçamentos/Você, topo verde no Início, Explorar com filtros liga/desliga, tela de Ofertas, Agenda,
perfil do negócio com capa e barra fixa de WhatsApp, painel do lojista com Painel/Catálogo/Ofertas/
Orçamentos/Mais (e menu lateral verde no computador). Também: horário estruturado com "Aberto agora"
calculado de verdade, slug amigável, nota da comunidade, equipe (gerente/atendente), editar/arquivar
produtos e novidades com foto, favoritar produto, vistos recentemente, "Pra você", interesse em evento
com .ics e lembrete na véspera, pedido de avaliação 2 dias depois do WhatsApp/cupom, resumo semanal
do lojista, respostas prontas e "escolher resposta" nos orçamentos, estatísticas 7/30/90 dias com
origem das visitas, impressões do Destaque, cartaz A4 com QR, teste grátis de 14 dias e bônus por
indicação (cortesias), imagem de compartilhamento do perfil, fotos otimizadas no upload (WebP,
máx. 1600px, sem GPS), páginas de categoria no sitemap, horário silencioso de push (22h–8h),
e-mail via Resend, admin com usuários (suspender de verdade), categorias, verificação, comunicados
segmentados e funil.

## Não implementado (próximas rodadas, por prioridade)

1. ~~Redesign visual~~ — feito (identidade "Tanguá", claro/escuro; `docs/MARCA.md`). Falta só
   revisar com dados reais as telas logadas (painel, admin, perfil), que a auditoria automática não
   alcança sem um banco de staging.
2. ~~Membros por negócio~~, ~~editar/arquivar produtos e posts~~, ~~favoritar produtos e salvar
   eventos~~, ~~estatísticas 30/90 dias~~ — feitos. Falta: rascunho de post e vídeo.
3. **Reivindicar perfil por link de convite** (hoje: pedido revisado pelo admin).
6. **Cobrança proporcional** em upgrade (decisão comercial — `docs/PAGAMENTOS.md`).
7. **Atualizar cartão sem sair do app**: hoje o lojista é orientado a atualizar no Mercado Pago.
8. **E-mail**: orçamentos já mandam e-mail (com Resend configurado). Falta cobrança e suporte.
9. **Geolocalização/mapa** na busca (o schema tem PostGIS; não há coleta de localização — de propósito).
10. **Testes E2E** dos fluxos de cupom com código e de orçamento (specs dos outros fluxos novos em
    `e2e/saas-self-service.spec.ts`, ainda não executados — exigem staging).
11. ~~Otimização de imagem no upload~~ — feito (WebP até 1600px).
12. **Middleware de sessão** (refresh proativo do cookie). Removido no passado por incidente; reavaliar
    com o preset Next.js correto na Vercel.
13. Paginação nas listas do painel do lojista (produtos/posts/avaliações carregam tudo do negócio —
    ok no volume atual).

## Riscos conhecidos aceitos

- Métricas do painel do proprietário e "populares" leem linhas e agregam em memória (até milhares de
  linhas). Adequado ao volume de uma cidade; migrar para views/materialized views se crescer.
- `rate_limits` cresce com o dedup de métricas; o cron diário limpa janelas com mais de 2 dias.
- CSP ainda com `'unsafe-inline'` em script (motivo documentado em `next.config.js`).
