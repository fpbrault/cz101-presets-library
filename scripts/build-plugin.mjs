#!/usr/bin/env node
/**
 * Cross-platform replacement for build-plugin.sh
 * Usage: bun run scripts/build-plugin.mjs [--release] [--arch native|arm64|x86_64|universal] [--platform macos|windows|linux]
 */

import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { arch, platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Parse args
const args = process.argv.slice(2);
const release = args.includes("--release");
const archArg =
	args.find((a) => a.startsWith("--arch"))?.split("=")[1] ??
	process.env.ARCH ??
	"native";
const platformArg = process.env.PLUGIN_PLATFORM ?? null;

const PLUGIN_BASENAME = process.env.PLUGIN_BASENAME ?? "CosmoPd101";

// Detect host OS
function detectPlatform() {
	const os = platform();
	if (os === "darwin") return "macos";
	if (os === "win32") return "windows";
	return "linux";
}

const hostPlatform = detectPlatform();
const targetPlatform = platformArg ?? hostPlatform;

const profileArg = release ? "--release" : "";
const profile = release ? "release" : "debug";

function run(cmd) {
	console.log(`==> ${cmd}`);
	execSync(cmd, { stdio: "inherit", cwd: ROOT });
}

function ensureRustTarget(target) {
	try {
		const installed = execSync("rustup target list --installed", {
			encoding: "utf8",
		});
		if (!installed.includes(target)) {
			run(`rustup target add ${target}`);
		}
	} catch {
		// ignore
	}
}

console.log(
	`==> Building ${PLUGIN_BASENAME} plugin (${profile}) for ${targetPlatform}, arch=${archArg}`,
);

if (targetPlatform === "macos") {
	const formatFlags = ["--vst3", "--auv2"];
	const buildAuv3 = process.env.BUILD_AUV3 === "1";
	if (buildAuv3) formatFlags.push("--auv3");

	if (archArg === "universal") {
		ensureRustTarget("x86_64-apple-darwin");
		ensureRustTarget("aarch64-apple-darwin");
	} else if (archArg === "x86_64") {
		ensureRustTarget("x86_64-apple-darwin");
	} else if (archArg === "arm64") {
		ensureRustTarget("aarch64-apple-darwin");
	}

	run(
		`cargo run --target-dir packages/xtask/target -p xtask -- bundle cosmo-pd101 ${formatFlags.join(" ")} --arch ${archArg} ${profileArg}`.trim(),
	);
} else {
	// Windows / Linux: use xtask with --vst3 only (no AUv2/AUv3)
	run(
		`cargo run --target-dir packages/xtask/target -p xtask -- bundle cosmo-pd101 --vst3 ${profileArg}`.trim(),
	);
}

console.log(`==> Done. Bundles are in packages/cosmo-pd101/target/${profile}/`);
