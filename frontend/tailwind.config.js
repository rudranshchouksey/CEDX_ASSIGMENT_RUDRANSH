/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#fafafa',
        surface: '#ffffff',
        surfaceBorder: 'rgba(226, 232, 240, 0.8)', // slate-200/80
        accent: '#4f46e5', // indigo-600
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        slate900: '#0f172a',
        slate500: '#64748b',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 1px 2px rgba(0, 0, 0, 0.02), 0 4px 6px -1px rgba(0, 0, 0, 0.01)',
      }
    },
  },
  plugins: [],
}
