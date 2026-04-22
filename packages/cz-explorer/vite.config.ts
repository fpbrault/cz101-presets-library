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
			mkdirSync(
				fileURLToPath(new URL("./src/lib/synth/bindings", import.meta.url)),
				{
					recursive: true,
				},
			);
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

const cosmoPd101Src = fileURLToPath(
	new URL("../cosmo-pd101/webview/src", import.meta.url),
);
const cosmoPresetCoreSrc = fileURLToPath(
	new URL("../cosmo-preset-core/src", import.meta.url),
);

// Synth UI/state/engine components moved to cosmo-pd101.
// These aliases redirect the moved paths so cz-explorer's visualizer still works.
const synthAliases = [
	"@/components/synth",
	"@/features/synth",
].map((prefix) => ({
	find: new RegExp(`^${prefix.replace("/", "\\/").replace("@", "@")}(/|$)`),
	replacement: `${cosmoPd101Src}/${prefix.slice(2)}/`,
}));

const synthFileAliases: { find: string; replacement: string }[] = [
	"context/ModMatrixContext",
	"components/pdAlgorithms",
	"components/SingleCycleDisplay",
	"components/ControlKnob",
	"components/BaseFxSection",
	"components/ChorusSection",
	"components/DelaySection",
	"components/ReverbSection",
	"components/StepEnvelopeEditor",
	"components/PerLineWarpBlock",
	"components/AlgoControlsGroup",
	"components/AlgoControlItem",
	"components/AlgoControlNumber",
	"components/AlgoControlSelect",
	"components/AlgoControlToggle",
	"components/AlgoControlTooltip",
	"components/algoControlTypes",
	"components/AlgoIconGrid",
	"components/ui/ModulatableControl",
	"components/ui/ModulationMenu",
	"components/ui/ModulationIconButton",
	"components/ui/CzHorizontalSlider",
	"components/ui/CzVerticalSlider",
	"components/ui/Card",
	"components/ui/CzButton",
	"components/ui/CzTabButton",
].map((relPath) => ({
	find: `@/${relPath}`,
	replacement: `${cosmoPd101Src}/${relPath}`,
}));

// lib/synth files now owned by cosmo-pd101 (except bindings which stay in cz-explorer)
const synthLibAliases: { find: string | RegExp; replacement: string }[] = [
	"lib/synth/algoRef",
	"lib/synth/modDestination",
	"lib/synth/defaultPresets",
	"lib/synth/pdVisualizerWorkletUrl",
	"lib/synth/drawOscilloscope",
	"lib/synth/pdOscillator",
	"lib/synth/windowFunction",
].map((relPath) => ({
	find: `@/${relPath}`,
	replacement: `${cosmoPd101Src}/${relPath}`,
}));

// preset-core files now in cosmo-preset-core
const presetCoreAliases: { find: string; replacement: string }[] = [
	{ find: "@/lib/synth/presetStorage", replacement: `${cosmoPresetCoreSrc}/presetStorage` },
	{ find: "@/lib/synth/czPresetConverter", replacement: `${cosmoPresetCoreSrc}/czPresetConverter` },
];

// update checker moved to cosmo-pd101
const updateAliases: { find: string; replacement: string }[] = [
	{ find: "@/lib/update/githubReleaseCheck", replacement: `${cosmoPd101Src}/update/githubReleaseCheck` },
];

// https://vitejs.dev/config/
export default defineConfig(async () => ({
	publicDir: "public",
	plugins: [spectaBindingsDevPlugin(), wasmDevPlugin(), react(), tailwindcss()],
	// Ensure .env is resolved relative to this config file even when launched via tauri tooling.
	envDir: fileURLToPath(new URL(".", import.meta.url)),
	envPrefix: ["VITE_", "TAURI_ENV_"],
	resolve: {
		alias: [
			...synthAliases,
			...synthFileAliases,
			...synthLibAliases,
			...presetCoreAliases,
			...updateAliases,
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
