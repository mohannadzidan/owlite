import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  build: { target: "es2015" },
  plugins: [devtools(), tanstackRouter({ target: "react", autoCodeSplitting: true }), viteReact()],
  server: {
    host: "0.0.0.0",
    cors: true,
  },
});
