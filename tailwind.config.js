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
        primary: {
          50: '#f5f3ff',
          100: '#ebe9ff',
          200: '#d9d5ff',
          300: '#beb7ff',
          400: '#9b91ff',
          500: '#776df1',
          600: '#635bdb',
          700: '#5148c5',
          800: '#443da2',
          900: '#393681',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
