import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: import.meta.dirname,
  // web 与 admin 共用仓库根的 node_modules，各自的缓存目录让两个 dev server 的依赖预打包互不覆盖。
  cacheDir: "../node_modules/.vite/web",
  build: {
    outDir: "dist/client",
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: ["terminal.local"],
  },
  plugins: [react()],
});
