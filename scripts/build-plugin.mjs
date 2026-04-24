#!/usr/bin/env node
/**
 * Cross-platform replacement for build-plugin.sh
 * Usage: bun run scripts/build-plugin.mjs [--release] [--arch native|arm64|x86_64|universal|all] [--platform macos|windows|linux]
 */

import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { arch, platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LIB_CRATE_NAME = "cosmo_pd101_plugin";

// Parse args
const args = process.argv.slice(2);
const release = args.includes("--release");
const archArg =
	args.find((a) => a.startsWith("--arch"))?.split("=")[1] ??
	process.env.ARCH ??
	"native";
const platformArg = process.env.PLUGIN_PLATFORM ?? null;

const PLUGIN_BASENAME = process.env.PLUGIN_BASENAME ?? "CosmoPd101";

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

function run(cmd, env = process.env) {
	console.log(`==> ${cmd}`);
	execSync(cmd, { stdio: "inherit", cwd: ROOT, env });
}

function targetRoot() {
	const fromEnv = process.env.CARGO_TARGET_DIR;
	if (!fromEnv) {
		return join(ROOT, "packages", "cosmo-pd101-plugin", "target");
	}
	return fromEnv.startsWith("/") || /^[A-Za-z]:[\\/]/.test(fromEnv)
		? fromEnv
		: join(ROOT, fromEnv);
}

function hostArchKey() {
	const host = arch();
	if (host === "arm64") return "arm64";
	if (host === "x64") return "x86_64";
	throw new Error(`Unsupported host arch '${host}'`);
}

function normalizeArchForPlatform(requestedArch, platformName) {
	if (platformName === "macos") {
		return requestedArch;
	}
	if (requestedArch === "universal") {
		return "all";
	}
	return requestedArch;
}

function resolveTargets(platformName, requestedArch) {
	const mode = normalizeArchForPlatform(requestedArch, platformName);
	const normalized = mode === "native" ? hostArchKey() : mode;

	if (platformName === "windows") {
		if (normalized === "arm64") return ["aarch64-pc-windows-msvc"];
		if (normalized === "x86_64") return ["x86_64-pc-windows-msvc"];
		if (normalized === "all")
			return ["aarch64-pc-windows-msvc", "x86_64-pc-windows-msvc"];
		throw new Error(`Unsupported arch '${requestedArch}' for windows`);
	}

	if (platformName === "linux") {
		if (normalized === "arm64") return ["aarch64-unknown-linux-gnu"];
		if (normalized === "x86_64") return ["x86_64-unknown-linux-gnu"];
		if (normalized === "all")
			return ["aarch64-unknown-linux-gnu", "x86_64-unknown-linux-gnu"];
		throw new Error(`Unsupported arch '${requestedArch}' for linux`);
	}

	throw new Error(`Unsupported platform '${platformName}'`);
}

function platformBundleSubdir(platformName, targetTriple) {
	if (platformName === "windows") {
		if (targetTriple.startsWith("aarch64-")) return "aarch64-win";
		if (targetTriple.startsWith("x86_64-")) return "x86_64-win";
	}
	if (platformName === "linux") {
		if (targetTriple.startsWith("aarch64-")) return "aarch64-linux";
		if (targetTriple.startsWith("x86_64-")) return "x86_64-linux";
	}
	throw new Error(
		`Unsupported target triple '${targetTriple}' for ${platformName}`,
	);
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
		`cargo run --target-dir packages/xtask/target -p xtask -- bundle cosmo-pd101-plugin ${formatFlags.join(" ")} --arch ${archArg} ${profileArg}`.trim(),
	);
} else {
	if (targetPlatform !== "windows" && targetPlatform !== "linux") {
		throw new Error(`Unsupported plugin platform '${targetPlatform}'.`);
	}

	const targets = resolveTargets(targetPlatform, archArg);
	const outRoot = targetRoot();
	const bundleDir = join(outRoot, profile, `${PLUGIN_BASENAME}.vst3`);

	rmSync(bundleDir, { recursive: true, force: true });

	for (const target of targets) {
		ensureRustTarget(target);
		run(
			`cargo build -p cosmo-pd101-plugin --features vst3 --target ${target} ${profileArg}`.trim(),
			{
				...process.env,
				CARGO_TARGET_DIR: outRoot,
			},
		);

		const platformSubdir = platformBundleSubdir(targetPlatform, target);
		const srcBinary =
			targetPlatform === "windows"
				? join(outRoot, target, profile, `${LIB_CRATE_NAME}.dll`)
				: join(outRoot, target, profile, `lib${LIB_CRATE_NAME}.so`);
		const dstBinary =
			targetPlatform === "windows"
				? join(bundleDir, "Contents", platformSubdir, `${PLUGIN_BASENAME}.vst3`)
				: join(bundleDir, "Contents", platformSubdir, `${PLUGIN_BASENAME}.so`);

		if (!existsSync(srcBinary)) {
			throw new Error(`Expected built plugin binary not found at ${srcBinary}`);
		}

		mkdirSync(join(bundleDir, "Contents", platformSubdir), { recursive: true });
		copyFileSync(srcBinary, dstBinary);
	}

	console.log(`==> Created ${bundleDir}`);
}

console.log(`==> Done. Bundles are in packages/cosmo-pd101-plugin/target/${profile}/`);
