import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf8ee",
          100: "#f9edcc",
          200: "#f2d88a",
          300: "#eac04e",
          400: "#e5aa2e",
          500: "#d4871a",
          600: "#b96615",
          700: "#994817",
          800: "#7d3919",
          900: "#672f18",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
