/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        claude: {
          orange: '#D97757',
          cream: '#FAF9F5',
          dark: '#1A1A1A',
          gray: '#6B6B6B',
        },
      },
      animation: {
        'shake': 'shake 0.5s ease-in-out',
        'pulse-success': 'pulse-success 0.5s ease-in-out',
        'diagram-fade-up': 'diagram-fade-up 0.4s ease-out forwards',
        'diagram-slide-right': 'diagram-slide-right 0.4s ease-out forwards',
        'diagram-scale-in': 'diagram-scale-in 0.3s ease-out forwards',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-8px)' },
          '75%': { transform: 'translateX(8px)' },
        },
        'pulse-success': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        'diagram-fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'diagram-slide-right': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'diagram-scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
