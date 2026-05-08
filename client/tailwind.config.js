/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#faf6ec',
        'cream-dark': '#f0e9d6',
        bunker: '#e8dcb5',
        sand: '#dfcc99',
        fescue: '#c9b574',
        fairway: '#2f5a3d',
        'fairway-light': '#4a7c5b',
        flag: '#a3392a',
        ink: '#2c2418',
      },
      fontFamily: {
        display: ['"Bitter"', 'Georgia', 'ui-serif', 'serif'],
      },
      keyframes: {
        livePulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 var(--ring, transparent)' },
          '50%': { boxShadow: '0 0 0 10px transparent' },
        },
      },
      animation: {
        'lead-pulse': 'livePulse 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
