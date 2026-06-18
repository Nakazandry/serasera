export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        ink: '#080a12',
        panel: '#101525',
        line: 'rgba(255,255,255,.11)',
      },
      boxShadow: {
        glow: '0 20px 70px rgba(45, 212, 191, .16)',
      },
    },
  },
  plugins: [],
};
