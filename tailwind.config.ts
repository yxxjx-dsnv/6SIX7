import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./*.tsx"],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
