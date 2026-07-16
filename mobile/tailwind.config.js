/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        kosh: {
          bg: '#F4F5F7',
          card: '#FFFFFF',
          primary: '#1B4D36',
          primaryLight: '#E8F0EC',
          accent: '#2B8A5A',
          textMain: '#111418',
          textMuted: '#687076',
          border: '#EAECEF',
        }
      }
    }
  },
  plugins: [],
}
