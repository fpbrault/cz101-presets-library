import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const _host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
	publicDir: "public",
	plugins: [react(), tailwindcss()],
	envDir: fileURLToPath(new URL(".", import.meta.url)),
	envPrefix: ["VITE_", "TAURI_ENV_"],
	resolve: {
		alias: [
			{
				find: "@cosmo/cosmo-pd101",
				replacement: fileURLToPath(
					new URL("../cosmo-pd101/lib-dist/index.mjs", import.meta.url),
				),
			},
			{
				find: "@",
				replacement: fileURLToPath(new URL("./src", import.meta.url)),
			},
		],
	},

	build: {
		rollupOptions: {
			input: {
				main: fileURLToPath(new URL("./index.html", import.meta.url)),
			},
		},
	},

	clearScreen: false,
	server: {
		port: 1421,
		strictPort: true,
		host: "0.0.0.0",
		watch: {
			ignored: ["**/src-tauri/**"],
		},
	},
}));
