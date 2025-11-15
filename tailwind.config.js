// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        montserrat: ['"Montserrat"', "sans-serif"],
      },
      colors: {
        'blue-dark': '#1E3A8A',
        'purple-dark': '#5B21B6',
      },
    },
  },
  plugins: [],
};
