/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        live: {
          accent: {
            DEFAULT: '#e04f38',
            hover: '#cc422d',
            subtle: 'rgba(224, 79, 56, 0.12)',
            glow: 'rgba(224, 79, 56, 0.25)',
          },
          dark: {
            bg: '#0c0d0e',
            secondary: '#15171a',
            surface: '#1d2024',
            surfaceHover: '#262a30',
            border: '#2a2e35',
            borderSubtle: '#1f2228',
            textPrimary: '#f4f4f5',
            textSecondary: '#9ca3af',
            textMuted: '#6b7280',
          },
          light: {
            bg: '#faf8f5',
            secondary: '#f2eee9',
            surface: '#ffffff',
            surfaceHover: '#f5f2ed',
            border: '#e4dfd8',
            borderSubtle: '#ebe7e0',
            textPrimary: '#151719',
            textSecondary: '#5a626a',
            textMuted: '#8b939c',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        heading: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

