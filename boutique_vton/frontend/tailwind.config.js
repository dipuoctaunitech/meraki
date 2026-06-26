/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        champagne: "#f8f5ef",
        ink: "#121212",
        sand: "#b4aa9a"
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "Times", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        luxury: "0 12px 35px rgba(18, 18, 18, 0.08)"
      }
    }
  },
  plugins: []
};
