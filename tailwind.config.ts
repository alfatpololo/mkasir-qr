import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
      },
      backgroundImage: {
        'gradient-green': 'linear-gradient(135deg, #14532d 0%, #166534 25%, #15803d 50%, #16a34a 75%, #22c55e 100%)',
        'gradient-green-light': 'linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%)',
        'gradient-green-dark': 'linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)',
      },
    },
  },
  plugins: [],
}
export default config


