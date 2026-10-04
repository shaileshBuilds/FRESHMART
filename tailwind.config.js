/** FRESHMART — Tailwind build config (mirrors the inline CDN config used in earlier parts). */
module.exports = {
  content: ['./index.html', './pages/*.html', './js/*.js'],
  theme: { extend: {
    colors: { primary: '#176B45', secondary: '#B7E46A', surface: '#F8FAF5', dark: '#17251D', muted: '#758078' },
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'] }
  } },
  plugins: []
};
