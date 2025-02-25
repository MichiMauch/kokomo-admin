import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Hauptfarbe (Grün)
        primary: {
          50:  '#F5FAEA',
          100: '#E0F2CF',
          200: '#C3D9B0',
          300: '#A5BF91',
          400: '#88A671',
          500: '#6B8C52', // Basis-Grün aus dem Bild
          600: '#678849',
          700: '#547A3B',
          800: '#425C2D',
          900: '#2F401F',
        },
        // Zweitfarbe (Braun/Holz)
        secondary: {
          50:  '#FDF8F0',
          100: '#F5EBD4',
          200: '#EDDBB6',
          300: '#DFC29B',
          400: '#D2AD88',
          500: '#C49866', // Basis-Braun aus dem Bild
          600: '#B08B4E',
          700: '#9B6F3B',
          800: '#7C5328',
          900: '#4E3515',
        },
        // Dritte Farbe (Blau/Himmel)
        tertiary: {
          50:  '#F3FAFD',
          100: '#E9F7FC',
          200: '#D5EEF9',
          300: '#B1DCF3',
          400: '#8EC9EE',
          500: '#6BB6E8', // Basis-Blau aus dem Bild
          600: '#4497D4',
          700: '#377AAB',
          800: '#295C82',
          900: '#1C3E59',
        },
		textDark: '#1F1F1F', 
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
