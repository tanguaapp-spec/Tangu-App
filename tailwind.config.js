/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta "Terra da Laranja": casca de laranja madura, não laranja-neon de app.
        casca: {
          50: '#FFF6EC',
          100: '#FFEAD2',
          200: '#FFD2A1',
          300: '#FFB465',
          400: '#FB9233',
          500: '#EF7A1A',  // laranja principal — cor de casca de laranja madura
          600: '#D2640F',
          700: '#AC4E0C',
          800: '#7E3A0C',
          900: '#502612',
        },
        // Verde Mata Atlântica (Serra do Barbosão) — contraponto, não decoração
        mata: {
          50: '#F0F7EE',
          100: '#DCEBD6',
          200: '#B7D0AD',
          300: '#93B583',
          400: '#6E9A5A',
          500: '#4F7A3D',  // verde principal
          600: '#3D612F',
          700: '#2E4A24',
          800: '#253B1D',
          900: '#1B2C15',
        },
        // Barro/terracota — usado em texto e estrutura, não em destaque
        barro: {
          50: '#FAF6F1',
          100: '#F1E7DC',
          200: '#E4D1BE',
          300: '#D6BBA0',
          400: '#B79B81',
          500: '#997A61',
          600: '#7A5A42',
          700: '#624936',
          800: '#4A372A',
          900: '#2E2219',
        },
        // base creme — papel de feira, não cream-startup #F4F1EA padrão
        feira: {
          DEFAULT: '#FBF4E9',
          card: '#FFFFFF',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        casca: '1.25rem',
      },
      boxShadow: {
        feira: '0 4px 24px -4px rgba(74, 55, 42, 0.12)',
        'feira-lg': '0 12px 40px -8px rgba(74, 55, 42, 0.18)',
      },
    },
  },
  plugins: [],
}
