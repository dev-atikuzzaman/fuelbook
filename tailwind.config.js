/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#04120c",
          900: "#071d14",
          800: "#0c2b1e",
          700: "#123a28",
          600: "#1a4d35",
        },
        gold: {
          400: "#ffcf5c",
          500: "#f5b400",
          600: "#e09b00",
        },
        cream: "#f4ead9",
      },
      fontFamily: {
        display: ["Georgia", "'Noto Serif Bengali'", "serif"],
        sans: ["'Hind Siliguri'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(245,180,0,0.15)",
        card: "0 8px 30px rgba(0,0,0,0.35)",
      },
      backgroundImage: {
        "radial-fade": "radial-gradient(circle at 20% 10%, rgba(245,180,0,0.10), transparent 40%), radial-gradient(circle at 80% 80%, rgba(26,77,53,0.35), transparent 45%)",
      },
    },
  },
  plugins: [],
};
