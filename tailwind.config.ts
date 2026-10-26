import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        notebook: {
          navy: "#0b2540",
          cream: "#fffdf6",
          warmBorder: "#e9c98a",
          line: "#b9cfe0",
        },
        sun: {
          50: "#fff8eb",
          100: "#fde6b9",
          300: "#f9c65e",
          500: "#f5a623",
          800: "#92400e",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
