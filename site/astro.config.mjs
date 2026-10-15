import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://cchandover.franklinokolie.com",
  vite: { plugins: [tailwindcss()] },
});
