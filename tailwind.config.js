/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        skyrim: {
          dark: '#0f0f0f',
          paper: '#c8c8c8',
          gold: '#c5a059',
          accent: '#3d4e58',
          border: '#4a4a4a'
        }
      }
    },
  },
  plugins: [],
}
