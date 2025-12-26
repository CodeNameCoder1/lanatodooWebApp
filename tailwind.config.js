/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#18181b', // zinc-900
        surface: '#27272a', // zinc-800
        primary: '#e4e4e7', // zinc-200
        secondary: '#a1a1aa', // zinc-400
        accent: '#f4f4f5', // zinc-100
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}