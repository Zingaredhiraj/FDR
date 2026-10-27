/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e8ecf5',
          100: '#c5cfe7',
          200: '#9eafd7',
          300: '#768ec7',
          400: '#5877bc',
          500: '#3a5fb0',
          600: '#2d508a',
          700: '#1f4070',
          800: '#0B1F4B',
          900: '#07132e',
          DEFAULT: '#0B1F4B',
        },
        accent: {
          DEFAULT: '#FF9933',
          light:   '#FFB366',
          dark:    '#CC7A29',
        },
        success: {
          DEFAULT: '#138808',
          light:   '#18b008',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'counter': 'counter 1s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideIn: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
};
