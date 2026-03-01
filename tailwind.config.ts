import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Lora", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        cream: {
          50: "#fefdf8",
          100: "#fdf9ed",
          200: "#faf2d6",
        },
        olive: {
          600: "#4a5e2f",
          700: "#3a4a24",
          800: "#2c3a1c",
        },
        terracotta: {
          400: "#c97b4b",
          500: "#b5673a",
          600: "#9e5530",
        },
      },
    },
  },
  plugins: [],
};

export default config;
