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
        outfit:    ['Outfit', 'sans-serif'],
      },
      colors: {
        /* DishDekho marketing site palette */
        dd: {
          orange:      '#FF6B00',
          'orange-dk': '#E85F00',
          'orange-lt': '#FFF1E6',
          navy:        '#0F2747',
          'navy-lt':   '#1B3A63',
          ink:         '#111827',
          muted:       '#5B6B7F',
          soft:        '#FFF8F3',
          line:        '#EAEAEA',
        },
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
      borderRadius: {
        card: '20px',
        btn:  '12px',
      },
      maxWidth: {
        container: '1280px',
      },
      boxShadow: {
        card:        '0 4px 24px rgba(15,39,71,0.06)',
        'card-hover':'0 14px 40px rgba(15,39,71,0.12)',
        soft:        '0 2px 14px rgba(15,39,71,0.05)',
        btn:         '0 8px 20px rgba(255,107,0,0.28)',
        phone:       '0 30px 60px rgba(15,39,71,0.28)',
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