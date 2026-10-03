import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"
export default defineConfig({plugins:[react(),tailwindcss()],server:{proxy:{"/api":{target:"http://127.0.0.1:4174",changeOrigin:false}}},resolve:{alias:{"@":path.resolve(import.meta.dirname,"./src")}}})
