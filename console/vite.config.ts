import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4030,
    strictPort: false,
    // Dev server talks to the bridge for brain data and the live-update stream.
    proxy: { "/api": "http://localhost:4317" },
  },
});
