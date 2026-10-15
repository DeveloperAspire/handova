import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://ccswap.vercel.app",
  vite: { plugins: [tailwindcss()] },
});
