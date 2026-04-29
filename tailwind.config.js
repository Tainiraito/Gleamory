/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 粉白配色 - 参考爱莉希雅
        'primary-pink': '#FFB7C5',
        'primary-light': '#FFF0F5',
        'primary-dark': '#E8879E',
        'accent-gold': '#FFD700',
        'accent-purple': '#E6E6FA',
        'text-primary': '#4A4A4A',
        'text-secondary': '#8A8A8A',
        'bg-white': '#FFFFFF',
        'bg-cream': '#FFFAF0',
      },
      fontFamily: {
        'sans': ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
