# Pagamentos e assinaturas (Mercado Pago)

## Modelo

- Assinatura mensal **sem plano associado** no Mercado Pago (`POST /preapproval` com
  `status: "pending"`): o servidor cria a cobrança e manda o lojista para o `init_point`, onde ele
  escolhe cartão/Pix/boleto **no site do Mercado Pago**. Nenhum dado de cartão passa pelo Tanguá App.
- `external_reference` = id da linha em `assinaturas` (liga a cobrança ao negócio certo).
- `X-Idempotency-Key` = `preapproval-<id local>`: repetir a requisição não cria duas assinaturas.
- Preço travado na contratação (`assinaturas.valor_centavos`). Mudar o preço do plano no painel não
  altera quem já assina.

## Fonte da verdade

O plano vale quando **o Mercado Pago confirma cobrança aprovada** — nunca porque o usuário voltou do
checkout ou porque o débito foi apenas autorizado. Quem decide o "plano efetivo" é a função SQL
`plano_efetivo(negocio_id)`, a partir de status **e datas** (um plano vencido deixa de valer na hora
certa mesmo que o cron atrase). Os limites são aplicados por triggers (`aplicar_limite_plano`),
então nem uma chamada direta à API passa do limite.

## Estados

```
pendente ──cobrança aprovada──▶ ativa ──cobrança recusada──▶ em_atraso (tolerância N dias)
   │                              │  ▲                           │
   │                              │  └────cobrança aprovada──────┘
   │                              ├──estorno/chargeback──▶ em_atraso (sem tolerância)
   │                              └──cancelada no MP──▶ cancelada (vale até o fim do período pago)
   └──cancelada/abandonada (7 dias)──▶ expirada
cancelada/em_atraso vencidas ──cron──▶ expirada
```

Implementação pura e testada: `lib/pagamentos/estado-assinatura.ts` (+ `pagamentos.test.ts`).
Eventos fora de ordem: cada assinatura guarda `ultimo_evento_em`; evento mais velho é ignorado.

## Webhook — `/api/webhooks/mercadopago`

1. Valida `x-signature` (HMAC-SHA256 do manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
   com `MERCADOPAGO_WEBHOOK_SECRET`). Inválido → 401, registrado como `ignorado` com motivo.
2. Registra em `eventos_webhook` (idempotência por id da notificação; entrega duplicada = 200 sem
   reprocessar).
3. Busca o recurso **na API do MP** (`/preapproval`, `/authorized_payments`, `/v1/payments`) e aplica
   o estado atual. Reprocessar é seguro.
4. Falha → 500 (o MP tenta de novo) + `status = falhou`; o cron reprocessa até 5 vezes.
5. Só guardamos: ids, status, `status_detail`, valor, datas. Corpo da notificação é reduzido a
   `action/type/live_mode/data.id` antes de salvar.

Tolerância de timestamp do `x-signature` está desligada por padrão (o MP reentrega notificações
antigas em retentativas, e o processamento é idempotente). Pode ser ligada em
`validarAssinaturaWebhook({ toleranciaMs })` se o MP passar a re-assinar as retentativas.

## Reconciliação — cron diário `/api/cron/assinaturas`

Re-sincroniza toda assinatura aberta com o MP (cobre webhook perdido), expira o que venceu, encerra
checkout abandonado há 7 dias (cancelando no MP), tira destaque vencido e reprocessa webhooks falhos.
Relatório de cada execução vai para `registros_auditoria` (`cron.assinaturas`).

## Troca de plano e cancelamento

- **Troca** (`trocarPlano`): `PUT /preapproval/{id}` com o novo valor; o novo valor vale a partir da
  próxima cobrança e os recursos mudam na hora. **Sem cobrança proporcional** — decisão comercial a
  revisar: hoje um upgrade no meio do mês dá os recursos do plano maior até a próxima cobrança sem
  pagar a diferença (perda máxima = diferença de 1 mês).
- **Cancelamento** (`cancelarAssinatura`): `PUT status=cancelled` no MP, depois sincroniza. Vale até
  o fim do período pago. Excluir a conta também cancela.
- **Inadimplência**: cobrança recusada → `em_atraso` com `assinatura_tolerancia_dias` (configurável
  em /painel/admin/configuracoes) → depois `expirada` e o negócio volta ao Gratuito sem perder dados.

## Testes

- Unitários (sem rede): assinatura HMAC, máquina de estados, mapeamento de status.
- Banco (PGlite): plano efetivo por datas, limites por trigger, bloqueio de escrita financeira pela API.
- **Não testado contra o Mercado Pago real nesta rodada** (sem credenciais). Antes de abrir para
  clientes: ciclo completo em sandbox (assinar → aprovar → recusar → cancelar), conferindo
  `/painel/admin/assinaturas`.

## Diagnóstico

`npx tsx scripts/testar-mercadopago.ts` — valida o token, cria uma assinatura **pendente** de R$ 1,00
(nada é cobrado), lê, **cancela na hora**, confere o HMAC com o segredo do `.env` e que a rota do
webhook está publicada e recusa requisição forjada. Rodado com sucesso em 22/10/2026 com as
credenciais de produção (conta MLB).

## Primeira cobrança real (fazer uma vez antes de divulgar)

1. Mercado Pago → Suas integrações → Webhooks → **Simular notificação** (evento *Planos e
   assinaturas*). Em /painel/admin/assinaturas#webhooks deve aparecer "assinatura HMAC: válida".
   Se aparecer "inválida", o segredo na Vercel está diferente do painel do MP.
2. Em /painel/admin/planos, crie temporariamente um plano `teste` de R$ 1,00 (ativo).
3. Com uma conta de lojista sua, assine esse plano pagando com Pix/cartão de verdade.
4. Confira: assinatura passa a **ativa** sozinha (webhook), pagamento aparece em "Histórico", o
   painel do proprietário mostra a receita confirmada.
5. Cancele pelo painel do lojista, confira "cancelada", desative o plano `teste` e, se quiser,
   estorne o R$ 1,00 pelo painel do Mercado Pago (o estorno também deve chegar pelo webhook).

## Pontos para confirmar com o Mercado Pago na sua conta

- Se `payment.external_reference` herda o da assinatura (o código também procura pelo
  `preapproval_id`; se nenhum vier, o pagamento é registrado como `ignorado` e a reconciliação
  diária ativa a assinatura pelo `summarized.charged_quantity`).
- Formato do `ts` no `x-signature` (ms ou s) — o código aceita os dois.
- Se a sua conta exige `card_token_id` (fluxo com plano associado). Este código usa o fluxo
  **sem** plano associado, que não exige.
