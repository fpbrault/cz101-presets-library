#!/usr/bin/env node
/**
 * Installs wasm-pack via cargo install.
 */

import { spawnSync } from "node:child_process";

// Skip in CI/Vercel — WASM is pre-built by the build-wasm workflow
if (process.env.CI || process.env.VERCEL) {
	console.log("CI/Vercel detected — skipping wasm-pack install.");
	process.exit(0);
}

const WASM_PACK_VERSION = "0.13.1";

// Check if wasm-pack is already installed
const check = spawnSync("wasm-pack", ["--version"], { stdio: "ignore" });
if (check.status === 0) {
	console.log("wasm-pack is already installed, skipping.");
	process.exit(0);
}

console.log(`Installing wasm-pack v${WASM_PACK_VERSION} via cargo...`);

try {
	spawnSync("cargo", ["install", "wasm-pack", `--version=${WASM_PACK_VERSION}`], {
		stdio: "inherit",
	});
	console.log(`wasm-pack v${WASM_PACK_VERSION} installed successfully.`);
} catch (error) {
	console.error("Failed to install wasm-pack via cargo. Please ensure Rust is installed.");
	process.exit(1);
}
