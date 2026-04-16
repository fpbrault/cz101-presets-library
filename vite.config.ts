import { execSync } from "node:child_process";
import { watch } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const wasmOutDir = fileURLToPath(
	new URL("./public/cz-synth-wasm", import.meta.url),
);

function wasmDevPlugin() {
	const wasmSrcDir = fileURLToPath(
		new URL("./src-tauri/cz-synth/src", import.meta.url),
	);
	const buildWasm = () => {
		console.log("[wasm-dev] Building WASM...");
		try {
			execSync(
				`wasm-pack build src-tauri/cz-synth --target no-modules --out-dir ${wasmOutDir} --features wasm`,
				{ stdio: "inherit" },
			);
			console.log("[wasm-dev] WASM build complete.");
		} catch {
			console.error("[wasm-dev] WASM build failed.");
		}
	};

	return {
		name: "wasm-dev",
		apply: "serve",
		configureServer(server) {
			buildWasm();
			let debounce: ReturnType<typeof setTimeout> | undefined;
			watch(wasmSrcDir, { recursive: true }, () => {
				clearTimeout(debounce);
				debounce = setTimeout(() => {
					buildWasm();
					server.ws.send({ type: "full-reload" });
				}, 300);
			});
		},
	};
}

const _host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
	publicDir: "public",
	plugins: [wasmDevPlugin(), react(), tailwindcss()],
	// Ensure .env is resolved relative to this config file even when launched via tauri tooling.
	envDir: fileURLToPath(new URL(".", import.meta.url)),
	envPrefix: ["VITE_", "TAURI_ENV_"],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},

	// Multi-entry build: main app + plugin WebView UI
	build: {
		rollupOptions: {
			input: {
				main: fileURLToPath(new URL("./index.html", import.meta.url)),
				plugin: fileURLToPath(new URL("./plugin.html", import.meta.url)),
			},
		},
	},

	// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
	//
	// 1. prevent vite from obscuring rust errors
	clearScreen: false,
	// 2. tauri expects a fixed port, fail if that port is not available
	server: {
		port: 1420,
		strictPort: true,
		host: "0.0.0.0",
		allowedHosts: ["macbook-pro.tailec1ed.ts.net"],
		watch: {
			// 3. tell vite to ignore watching `src-tauri`
			ignored: ["**/src-tauri/**"],
		},
	},
}));
