import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const webviewDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(webviewDir, "../../..");
const explorerSrc = path.join(repoRoot, "packages/cz-explorer/src");

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": explorerSrc,
		},
		dedupe: ["react", "react-dom"],
	},
	server: {
		fs: {
			allow: [repoRoot],
		},
	},
	base: "./",
	build: {
		outDir: "dist",
	},
});
