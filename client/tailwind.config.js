export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        'secondary': 'linear-gradient(180deg, #36333B 0%, #46434B 0.01%, #48454D 91.15%)',
      },
      colors: {
        'primary': '#2E2B33',
        'button-fill': '#12B754',
        'button-withdraw': '#FF443A',
        'surface': '#f0f0f0',
        'error': '#ef4444',
        'error-muted': '#fee2e2',
        'warning': '#f59e0b',
        'warning-muted': '#fefcbf',
      },
      boxShadow: {
        'lg': '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'], // Добавили Inter
      },
    },
  },
  plugins: [],
}
