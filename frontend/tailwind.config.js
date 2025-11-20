/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00E5FF', // Cyan
          dark: '#00B8D4',
          light: '#84FFFF',
        },
        secondary: {
          DEFAULT: '#7C4DFF', // Deep Purple
          dark: '#651FFF',
          light: '#B388FF',
        },
        dark: {
          950: '#050507', // Almost black
          900: '#0A0A0F', // Very dark blue-gray
          800: '#12121A', // Dark panel bg
          700: '#1E1E2A', // Lighter panel bg
        },
        accent: {
          pink: '#FF4081',
          amber: '#FFD740',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out forwards',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: 1, filter: 'brightness(1)' },
          '50%': { opacity: 0.8, filter: 'brightness(1.2)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #7C4DFF 0deg, #00E5FF 180deg, #7C4DFF 360deg)',
      }
    },
  },
  plugins: [],
}
