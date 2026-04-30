import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: ".",
  base: "/MAInD-Making_Use_of_Data-2026-Lugano_Parks/",
  publicDir: "public",
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
  },
});
