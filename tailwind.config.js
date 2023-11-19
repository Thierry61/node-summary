/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        // 3 columns at 832px instead of 768px
        'md': '832px',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: 0.2 },
          '50%': { opacity: 1 },
        },
      },
      animation: {
        // Little animation for a new value
        update: 'blink 0.4s ease-in-out 3',
      }
    },
  },
  plugins: [],
}
