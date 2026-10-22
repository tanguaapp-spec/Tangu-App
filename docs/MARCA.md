# Identidade visual — Tanguá (out/2026)

Projeto aprovado no canvas "Tanguá App — Nova marca". Aqui fica como ela vive no código.

## Essência

- **Símbolo:** alfinete de mapa (é daqui, é perto) com a laranja cortada da cidade da laranja e a
  folha da serra. Componente: `components/marca/logo-tangua.tsx` (`LogoTangua`, `MarcaTangua`).
- **Nome escrito:** sempre em minúsculas, **tanguá**. Em texto corrido: "Tanguá App".
- **Slogan:** Tudo de Tanguá, perto de você.
- **Voz:** vizinho que indica um lugar bom. Frases curtas, verbos de ação, nome do bairro. Nada de
  "o melhor da cidade" sem dado; destaque pago sempre aparece como "Destaque".

## Cores (fonte única: `lib/tema/paleta.ts`)

| Token | Claro | Uso |
|---|---|---|
| `serra` | `#0E4D3A` | marca, botões secundários, blocos de destaque |
| `serra-escuro` | `#0A2E24` | cabeçalho mobile, rodapé, barra inferior |
| `laranja` | `#F26A1B` | ação principal e ofertas — **texto sempre `tinta`, nunca branco** |
| `tinta` | `#13241D` | texto sobre laranja |
| `fundo` / `superficie` | `#F4F6F1` / `#FFFFFF` | fundo do app / cards |
| escalas `mata`, `casca`, `barro`, `red`, `yellow` | 50–900 | texto, bordas, fundos tingidos |

As escalas **invertem no modo escuro** (o tom 50 é sempre "fundo tingido", o 900 é sempre "texto
forte"), então `text-barro-700` e `bg-casca-50` funcionam nos dois temas sem `dark:`. Os tokens de
marca (`serra`, `laranja`, `tinta`) quase não mudam.

**Regras práticas**
- Fundo sólido de marca: `bg-serra text-white` ou `bg-laranja text-tinta`. Nunca `bg-mata-600
  text-white` (no escuro o mata-600 fica claro).
- Texto sobre `serra`/`serra-escuro`: `text-white` ou `text-white/70–90`, nunca `text-barro-*`
  (inverteria no escuro e sumiria).
- Card: `bg-superficie`, não `bg-white`.
- Alterou a paleta? `npm run tema` regenera `app/tema.css`; `npm test` confere 20 pares de
  contraste WCAG AA nos dois temas.

## Tipografia

- Títulos: **Familjen Grotesk** 600/700 (`font-display`, −2% de espaçamento).
- Texto: **Figtree** 400–700 (`font-body`).
- Preços e códigos de cupom: **JetBrains Mono** 500/700 (`font-mono`).

## Claro/escuro

- Padrão: **Automático** (segue o celular). Escolha salva no aparelho (`localStorage`,
  `tangua-tema`): botão no cabeçalho, "Aparência" no perfil e no menu do painel.
- `lib/tema/preferencia.ts` aplica `html.dark` antes da primeira pintura (sem piscar).
- Logo: variante `auto` troca o alfinete verde (claro) pelo branco (escuro); `sobre-escuro` para
  fundos verdes fixos.

## Ícones do app

`node scripts/gerar-icones.js` gera `icon-192/512`, `icon-512-maskable`, `apple-touch-icon` e
`favicon.png/.svg` a partir do mesmo desenho do símbolo.
