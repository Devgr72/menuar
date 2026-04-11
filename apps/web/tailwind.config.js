/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        nunito: ['Nunito', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
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