import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./ui/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0A5C87",
          foreground: "#F8FAFC"
        },
        accent: {
          DEFAULT: "#FCE762",
          foreground: "#1F2937"
        }
      }
    }
  },
  plugins: []
};

export default config;
