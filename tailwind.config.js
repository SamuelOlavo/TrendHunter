/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./plano.html",
    "./dashboard.html",
    "./dashboard.js"
  ],
  theme: {
    extend: {
      colors: {
        'trend-green': '#d4ff3f',
        'trend-green-dark': '#b8e600',
        'ml-yellow': '#ffe600',
        'amazon-orange': '#ff9900',
        'amazon-orange-dark': '#ff9500',
        'shopee-red': '#ee4d2d',
        'dark-bg': '#0f0f0f',
        'dark-card': '#1a1a1a',
        'dark-footer': '#121212',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
