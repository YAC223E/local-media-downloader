import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxy keeps LAN testing simple: the Vite server forwards /api to FastAPI.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
  build: { outDir: "dist", sourcemap: false },
});
