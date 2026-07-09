/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'serif']
      },
      colors: {
        brand: {
          cream: '#f7f3ea', sand: '#ece3d2', gold: '#d8891f', red: "#111111", leaf: '#4f8c47', leafDark: "#111111", ink: "#111111"
        }
      },
      boxShadow: {
        soft: '0 20px 60px rgba(35,21,17,.08)',
        lift: '0 28px 80px rgba(35,21,17,.16)'
      },
      backgroundImage: {
        'brand-radial': 'radial-gradient(circle at top right, rgba(216,137,31,.18), transparent 30%), radial-gradient(circle at left 20%, rgba(79,140,71,.12), transparent 34%), linear-gradient(180deg, #f7f3ea, #fffdf8)'
      }
    }
  },
  plugins: []
};