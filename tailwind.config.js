/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./public/**/*.{html,js}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        aqua: {
          50:  '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',  // Hellblau/Türkis - Heller Gradient-Start
          500: '#06B6D4',  // Haupt-Hellblau/Türkis (BG)
          600: '#0891B2',  // Hover/aktive Flächen - Dunklerer Gradient-Ende
          700: '#0E7490',  // Fokus-Ring & starke CTAs
          800: '#155E75',
          900: '#164E63'
        }
      },
      borderRadius: {
        'xxl': '1.25rem'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeOut: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-6px)' }
        },
        pulseSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' }
        }
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-out both',
        'fade-out': 'fadeOut 250ms ease-in both',
        'pulse-soft': 'pulseSoft 1800ms ease-in-out infinite'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif']
      }
    }
  },
  plugins: []
}
