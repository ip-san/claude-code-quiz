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
        'feedback-enter': 'feedback-enter 0.4s ease-out forwards',
        'feedback-section': 'feedback-section 0.35s ease-out forwards',
        'code-highlight': 'code-highlight 1.2s ease-in-out forwards',
        'result-enter': 'result-enter 0.5s ease-out forwards',
        'count-up': 'count-up 0.6s ease-out forwards',
        'star-pop': 'star-pop 0.3s ease-out forwards',
        'option-pop': 'option-pop 0.15s ease-out',
        'option-correct': 'option-correct 0.4s ease-out',
        'option-wrong': 'option-wrong 0.4s ease-in-out',
        'card-enter': 'card-enter 0.3s ease-out forwards',
        'slide-down': 'slide-down 0.3s ease-out forwards',
        'progress-fill': 'progress-fill 0.8s ease-out forwards',
        'bounce-in': 'bounce-in 0.4s ease-out forwards',
        'view-enter': 'view-enter 0.3s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'confetti': 'confetti 0.8s ease-out forwards',
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
        'feedback-enter': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'feedback-section': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'code-highlight': {
          '0%': { backgroundSize: '0% 100%' },
          '40%': { backgroundSize: '100% 100%' },
          '100%': { backgroundSize: '100% 100%' },
        },
        'result-enter': {
          '0%': { opacity: '0', transform: 'scale(0.9) translateY(20px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '50%': { transform: 'translateY(-3px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'star-pop': {
          '0%': { opacity: '0', transform: 'scale(0)' },
          '70%': { transform: 'scale(1.2)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'option-pop': {
          '0%': { transform: 'scale(0.97)' },
          '50%': { transform: 'scale(1.01)' },
          '100%': { transform: 'scale(1)' },
        },
        'option-correct': {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
        'option-wrong': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-4px)' },
          '40%': { transform: 'translateX(4px)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(2px)' },
        },
        'card-enter': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'progress-fill': {
          '0%': { width: '0%' },
        },
        'bounce-in': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'view-enter': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'confetti': {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-60px) scale(0.5)' },
        },
      },
    },
  },
  plugins: [],
}
