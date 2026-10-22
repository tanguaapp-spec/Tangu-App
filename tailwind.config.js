/** @type {import('tailwindcss').Config} */

// Cada cor lê uma variável CSS com os canais RGB (definidas em
// app/globals.css para o tema claro e o escuro). Assim as classes de sempre
// (text-barro-700, bg-casca-50...) trocam de valor sozinhas no modo escuro.
const escala = (nome) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((tom) => [tom, `rgb(var(--${nome}-${tom}) / <alpha-value>)`])
  )
const token = (nome) => `rgb(var(--${nome}) / <alpha-value>)`

module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Escalas que se adaptam ao tema (tons claros viram fundos escuros e
        // vice-versa). Use para texto, bordas e fundos tingidos.
        casca: escala('casca'), // laranja Tanguá
        mata: escala('mata'), // verde Serra
        barro: escala('barro'), // neutros (tinta)
        red: escala('red'),
        yellow: escala('yellow'),

        // Tokens de marca que NÃO invertem: botões e áreas de cor sólida.
        serra: { DEFAULT: token('serra'), escuro: token('serra-escuro') },
        laranja: { DEFAULT: token('laranja'), claro: token('laranja-claro') },
        tinta: token('tinta'), // texto sobre laranja (sempre escuro)
        superficie: token('superficie'), // cards
        feira: { DEFAULT: token('fundo'), card: token('superficie') }, // fundo do app
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        casca: '1.5rem',
      },
      boxShadow: {
        feira: '0 4px 24px -6px rgb(var(--sombra) / 0.14)',
        'feira-lg': '0 14px 40px -10px rgb(var(--sombra) / 0.22)',
      },
    },
  },
  plugins: [],
}
