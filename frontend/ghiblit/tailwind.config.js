// tailwind.config.js (or .mjs)
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "ghibli-blue": "#5EBFE2",
        "ghibli-green": "#59A459", 
        "ghibli-cream": "#FFF6C8",
        "ghibli-dark": "#5A4A3F",
      },
      fontFamily: {
        playfair: ["var(--font-playfair)", "serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}