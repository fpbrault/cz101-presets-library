#!/usr/bin/env node
/**
 * Installs wasm-pack by downloading a pre-built binary where available,
 * falling back to `cargo install` otherwise.
 */

import { execSync, spawnSync } from "node:child_process";
import { chmodSync, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { arch, platform, tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

const WASM_PACK_VERSION = "0.13.1";

// Check if wasm-pack is already installed
const check = spawnSync("wasm-pack", ["--version"], { stdio: "ignore" });
if (check.status === 0) {
	console.log("wasm-pack is already installed, skipping.");
	process.exit(0);
}

const os = platform();
const cpu = arch();

// Map to wasm-pack release asset names
const targets = {
	linux: { x64: "x86_64-unknown-linux-musl" },
	darwin: { x64: "x86_64-apple-darwin", arm64: "aarch64-apple-darwin" },
	win32: { x64: "x86_64-pc-windows-msvc" },
};

const target = targets[os]?.[cpu];

if (!target) {
	console.warn(
		`No pre-built wasm-pack binary for ${os}/${cpu}. Falling back to \`cargo install wasm-pack\`.\n` +
			"If this fails on Windows, install LLVM first: winget install LLVM.LLVM",
	);
	execSync("cargo install wasm-pack", { stdio: "inherit" });
	process.exit(0);
}

const ext = os === "win32" ? ".zip" : ".tar.gz";
const assetName = `wasm-pack-v${WASM_PACK_VERSION}-${target}${ext}`;
const url = `https://github.com/rustwasm/wasm-pack/releases/download/v${WASM_PACK_VERSION}/${assetName}`;
const dest = join(tmpdir(), assetName);
const cargobin = join(
	process.env.CARGO_HOME ??
		join(process.env.HOME ?? process.env.USERPROFILE ?? "~", ".cargo"),
	"bin",
);

console.log(`Downloading wasm-pack v${WASM_PACK_VERSION} for ${os}/${cpu}...`);

const res = await fetch(url);
if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);

const writer = createWriteStream(dest);
await pipeline(res.body, writer);

mkdirSync(cargobin, { recursive: true });

if (os === "win32") {
	// Extract zip
	execSync(
		`tar -xf "${dest}" -C "${cargobin}" --strip-components=1 wasm-pack.exe`,
		{
			stdio: "inherit",
		},
	);
} else {
	const binary = join(cargobin, "wasm-pack");
	execSync(
		`tar -xzf "${dest}" --strip-components=1 -C "${cargobin}" ${target}/wasm-pack`,
		{ stdio: "inherit" },
	);
	if (existsSync(binary)) chmodSync(binary, 0o755);
}

console.log(`wasm-pack installed to ${cargobin}`);
