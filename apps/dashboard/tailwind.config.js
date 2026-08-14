/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#8B5CF6',
          dark: '#6D28D9',
          accent: '#A78BFA',
          bg: '#0F0A1F',
          surface: '#18112B',
        },
        dark: {
          50: '#18112B',
          100: '#150E26',
          200: '#120C21',
          300: '#0F0A1F',
          900: '#0A0614',
        },
        electric: {
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          glow: 'rgba(139, 92, 246, 0.25)',
        },
        deep: {
          800: '#18112B',
          900: '#0F0A1F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px rgba(139, 92, 246, 0.25)',
        'glow-lg': '0 0 40px rgba(139, 92, 246, 0.4)',
      },
    },
  },
  plugins: [],
};
