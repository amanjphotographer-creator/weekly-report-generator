/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#060D1A",
          800: "#0A1628",
          700: "#0F2040",
          600: "#152B56",
          500: "#1E3D73",
          400: "#2E5FAC",
          300: "#4A7FD4",
        },
        cream: "#F8F6F1",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 32px rgba(0,0,0,0.4)",
        glow: "0 0 24px rgba(46,95,172,0.4)",
      },
    },
  },
  plugins: [],
};
