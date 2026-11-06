/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        omniflex: {
          base: "#060709",
          darkSteel: "#0F1115",
          card: "#16181F",
          primarySteel: "#E2E8F0",
          accentMetal: "#94A3B8",
          border: "rgba(255, 255, 255, 0.08)",
        },
        aniflex: {
          bg: "#060709",
          secondary: "#0F1115",
          card: "#16181F",
          steel: "#E2E8F0",
          "steel-muted": "#94A3B8",
          "steel-dark": "#64748B",
          text: "#FFFFFF",
          "text-muted": "#94A3B8",
          border: "rgba(255, 255, 255, 0.08)",
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
