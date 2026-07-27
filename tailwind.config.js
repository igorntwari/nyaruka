/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
  './app/**/*.{js,ts,jsx,tsx,mdx}',
  './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  extend: {
  colors: {
    route: {
    DEFAULT: '#0F6B4C', // primary brand green the road, not the eco cliché
    deep: '#0A4E38',  // pressed / active state
    mint: '#E7F4EC',  // soft tint for cards, badges
    },
    paper: '#FAF9F5',   // base background, warm but not the AI-cream default
    ink: {
    DEFAULT: '#16241D', // near-black, green-tinted body text
    soft: '#4B5A52',  // secondary text
    },
    amber: {
    DEFAULT: '#C98A1F', // MoMo / currency accent, used sparingly
    soft: '#F6E9CE',
    },
    danger: '#B23A2E',
  },
  fontFamily: {
    display: ['var(--font-sora)', 'sans-serif'],
    body: ['var(--font-inter)', 'sans-serif'],
    mono: ['var(--font-plex-mono)', 'monospace'],
  },
  borderRadius: {
    card: '18px',
  },
  boxShadow: {
    soft: '0 2px 14px rgba(22, 36, 29, 0.06)',
  },
  },
  },
  plugins: [],
};
