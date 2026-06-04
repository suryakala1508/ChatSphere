/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          50: '#f0faf4',
          100: '#dcf5e3',
          200: '#b9ebc8',
          300: '#88daa3',
          400: '#51c178',
          500: '#2da85c',
          600: '#1f8b4a',
          700: '#1b6e3c',
          800: '#1a5833',
          900: '#18492c',
          accent: '#00a884',
          'accent-dark': '#06cf9c',
          'sent': '#d9fdd3',
          'sent-dark': '#005c4b',
          'received': '#ffffff',
          'received-dark': '#202c33',
          'chat-bg': '#efeae2',
          'chat-bg-dark': '#0b141a',
          'sidebar': '#ffffff',
          'sidebar-dark': '#111b21',
          'header': '#f0f2f5',
          'header-dark': '#202c33',
          'input': '#f0f2f5',
          'input-dark': '#202c33',
          'border-light': '#e9edef',
          'border-dark': '#313d45',
          'text-primary': '#111b21',
          'text-primary-dark': '#e9edef',
          'text-secondary': '#667781',
          'text-secondary-dark': '#8696a0',
        }
      }
    },
  },
  plugins: [],
};
