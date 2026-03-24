/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: '#409EFF',
        sidebar: '#2d2d2d',
        activityBar: '#333333',
        active: '#409EFF20',
        border: '#404040',
        textMain: '#cccccc',
        textMuted: '#858585',
        primary: '#409EFF',
      }
    },
  },
  plugins: [],
}
