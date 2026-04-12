/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins:   ['Poppins', 'sans-serif'],
        nunito:    ['Nunito', 'sans-serif'],
        inter:     ['Inter', 'sans-serif'],
        fraunces:  ['Fraunces', 'Georgia', 'serif'],
        'dm-sans': ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        brand: {
          navy:    '#0f2356',
          blue:    '#1a3a8f',
          sky:     '#2563eb',
          light:   '#60a5fa',
          gold:    '#f59e0b',
          amber:   '#fbbf24',
          orange:  '#ea580c',
        },
        parchment: {
          50:  '#FDFAF4',
          100: '#F9F4E8',
          200: '#F2EAD5',
          300: '#E8DDBF',
          400: '#D4C9A8',
          500: '#B8A882',
        },
        forest: {
          50:  '#F0F4F0',
          100: '#D6E5D6',
          200: '#A8C9A8',
          300: '#6FA06F',
          400: '#4A7A4A',
          500: '#2B4A2B',
          600: '#1E341E',
          700: '#142314',
        },
        spice: {
          gold:   '#C5922A',
          amber:  '#E8A83A',
          light:  '#F7D080',
          saffron:'#E8640A',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0f2356 0%, #1a3a8f 50%, #2563eb 100%)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        float:      'float 4s ease-in-out infinite',
        'float-2':  'float 5s ease-in-out infinite 1s',
        'float-3':  'float 6s ease-in-out infinite 2s',
        'spin-slow':'spin-slow 20s linear infinite',
      },
    },
  },
  plugins: [],
}