import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, watch } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const wasmOutDir = fileURLToPath(
	new URL("./public/cosmo-synth-engine-wasm", import.meta.url),
);
const wasmCargoTargetDir = fileURLToPath(
	new URL("../cosmo-synth-engine/target", import.meta.url),
);

function wasmDevPlugin() {
	const wasmSrcDir = fileURLToPath(
		new URL("../cosmo-synth-engine/src", import.meta.url),
	);
	const buildWasm = () => {
		console.log("[wasm-dev] Building WASM...");
		try {
			execSync(
				`wasm-pack build ../cosmo-synth-engine --target no-modules --out-dir ${wasmOutDir} --features wasm`,
				{
					stdio: "inherit",
					env: {
						...process.env,
						CARGO_TARGET_DIR: wasmCargoTargetDir,
					},
				},
			);
			const generatedGitignore = `${wasmOutDir}/.gitignore`;
			if (existsSync(generatedGitignore)) {
				rmSync(generatedGitignore);
			}
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

const spectaTsBindingsOutFile = fileURLToPath(
	new URL("./src/lib/synth/bindings/synth.ts", import.meta.url),
);
const cosmoSynthEngineDir = fileURLToPath(
	new URL("../cosmo-synth-engine", import.meta.url),
);

function spectaBindingsDevPlugin() {
	const wasmSrcDir = fileURLToPath(
		new URL("../cosmo-synth-engine/src", import.meta.url),
	);
	const exportBindings = () => {
		console.log("[specta-bindings] Exporting TypeScript bindings...");
		try {
			mkdirSync(fileURLToPath(new URL("./src/lib/synth/bindings", import.meta.url)), {
				recursive: true,
			});
			execSync(
				"cargo run --features specta-bindings --bin export-specta-bindings",
				{
					stdio: "inherit",
					cwd: cosmoSynthEngineDir,
					env: {
						...process.env,
						CARGO_TARGET_DIR: wasmCargoTargetDir,
						SPECTA_TS_EXPORT_PATH: spectaTsBindingsOutFile,
					},
				},
			);
			console.log("[specta-bindings] TypeScript bindings updated.");
		} catch {
			console.error("[specta-bindings] TypeScript bindings export failed.");
		}
	};

	return {
		name: "specta-bindings-dev",
		apply: "serve",
		configureServer(server) {
			exportBindings();
			let debounce: ReturnType<typeof setTimeout> | undefined;
			watch(wasmSrcDir, { recursive: true }, () => {
				clearTimeout(debounce);
				debounce = setTimeout(() => {
					exportBindings();
					server.ws.send({ type: "full-reload" });
				}, 500);
			});
		},
	};
}

const _host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
	publicDir: "public",
	plugins: [spectaBindingsDevPlugin(), wasmDevPlugin(), react(), tailwindcss()],
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
