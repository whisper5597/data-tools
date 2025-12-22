/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          light: '#0891b2',
          mid: '#0e7490',
          deep: '#164e63',
          darker: '#1a3c4a',
          gradient: '#0c5a6f'
        },
        seaweed: {
          dark: '#065f46',
          medium: '#047857',
          light: '#059669',
          pale: '#10b981'
        },
        coral: {
          orange: '#f97316',
          pink: '#ec4899',
          purple: '#8b5cf6'
        }
      },
      animation: {
        'ocean-gradient': 'ocean-gradient 20s ease infinite',
        'light-beam-1': 'light-beam-1 8s ease-in-out infinite',
        'light-beam-2': 'light-beam-2 10s ease-in-out infinite',
        'light-beam-3': 'light-beam-3 12s ease-in-out infinite',
        'bubble-0': 'bubble-0 linear infinite',
        'bubble-1': 'bubble-1 linear infinite',
        'bubble-2': 'bubble-2 linear infinite',
        'seaweed': 'seaweed 6s ease-in-out infinite',
        'coral': 'coral 5s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 1s ease-out',
        'fish-swimming-1': 'fish-swimming-1 15s linear infinite',
        'fish-swimming-2': 'fish-swimming-2 18s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(-45deg)' },
          '50%': { transform: 'translateY(-5px) rotate(-45deg)' },
        },
        'ocean-gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '10%': { backgroundPosition: '10% 60%' },
          '20%': { backgroundPosition: '20% 40%' },
          '30%': { backgroundPosition: '30% 70%' },
          '40%': { backgroundPosition: '40% 30%' },
          '50%': { backgroundPosition: '50% 80%' },
          '60%': { backgroundPosition: '60% 20%' },
          '70%': { backgroundPosition: '70% 90%' },
          '80%': { backgroundPosition: '80% 10%' },
          '90%': { backgroundPosition: '90% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        }
      },
      backgroundSize: {
        '600-auto': '600% auto',
      }
    },
  },
  plugins: [],
}