import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'warm-ivory': '#F5F0E8',
        'dusty-rose': '#C9A99A',
        'soft-sage': '#B5C4B1',
        'muted-gold': '#C9B458',
        'deep-espresso': '#3E2723',
        'charcoal': '#3D3D3D',
        'warm-taupe': '#C9B8A8',
        'cream-hover': '#EDE6DB',
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
