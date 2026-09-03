/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        flux: {
          bg: '#121214',
          sidebar: '#161618',
          canvas: '#e7e7e9',
          card: '#ffffff',
          darkcard: '#1a1a1e',
          lime: '#d4ff32',
          limeHover: '#c4f024',
          lavender: '#b8a5fe',
          lavenderLight: '#e0d8ff',
          coral: '#f87171',
          cyan: '#38bdf8',
          textDark: '#111827',
          textMuted: '#6b7280',
          border: '#e2e8f0',
        }
      },
      boxShadow: {
        'flux-card': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'flux-glow': '0 0 25px -5px rgba(212, 255, 50, 0.4)',
      }
    },
  },
  plugins: [],
};
