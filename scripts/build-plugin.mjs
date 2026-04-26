#!/usr/bin/env node
/**
 * Cross-platform replacement for build-plugin.sh
 * Usage: bun run scripts/build-plugin.mjs [--release] [--arch native|arm64|x86_64|universal|all] [--platform macos|windows|linux] [--auv2] [--auv3]
 *
 * macOS note: VST3 is built via the custom xtask. CLAP is packaged from the same dylib.
 * AUv2 is built separately via clap-wrapper cmake (packages/cosmo-pd101-plugin/au-wrapper/).
 */

import { execSync } from "node:child_process";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
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
const CLAP_BUNDLE_ID = "jp.cosmo.pd101";
const PLUGIN_VERSION = "0.1.0";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map archArg / host to a macOS target triple. */
function archArgToAppleTriple(requestedArch) {
	if (requestedArch === "arm64") return "aarch64-apple-darwin";
	if (requestedArch === "x86_64") return "x86_64-apple-darwin";
	if (requestedArch === "native") {
		const h = arch();
		if (h === "arm64") return "aarch64-apple-darwin";
		if (h === "x64") return "x86_64-apple-darwin";
		throw new Error(`Unsupported host arch: ${h}`);
	}
	throw new Error(`Cannot resolve apple triple for arch: ${requestedArch}`);
}

/** Build and package a .clap bundle from the dylib already compiled by xtask. */
function buildClapBundle(archArg, profile, outRoot) {
	const clapBundlePath = join(outRoot, profile, `${PLUGIN_BASENAME}.clap`);
	const clapBinaryDir = join(clapBundlePath, "Contents", "MacOS");
	const clapBinaryPath = join(clapBinaryDir, PLUGIN_BASENAME);

	rmSync(clapBundlePath, { recursive: true, force: true });
	mkdirSync(clapBinaryDir, { recursive: true });

	let dylibPath;
	if (archArg === "universal") {
		const arm64Dylib = join(
			outRoot,
			"aarch64-apple-darwin",
			profile,
			`lib${LIB_CRATE_NAME}.dylib`,
		);
		const x86Dylib = join(
			outRoot,
			"x86_64-apple-darwin",
			profile,
			`lib${LIB_CRATE_NAME}.dylib`,
		);
		dylibPath = join(outRoot, profile, `lib${LIB_CRATE_NAME}.dylib`);
		if (!existsSync(dylibPath)) {
			run(`lipo -create -output "${dylibPath}" "${arm64Dylib}" "${x86Dylib}"`);
		}
	} else {
		const triple = archArgToAppleTriple(archArg);
		dylibPath = join(outRoot, triple, profile, `lib${LIB_CRATE_NAME}.dylib`);
	}

	if (!existsSync(dylibPath)) {
		throw new Error(
			`CLAP dylib not found at ${dylibPath} — ensure the VST3 build ran first`,
		);
	}

	copyFileSync(dylibPath, clapBinaryPath);
	try {
		execSync(
			`install_name_tool -id "@rpath/${PLUGIN_BASENAME}" "${clapBinaryPath}"`,
			{ stdio: "inherit" },
		);
	} catch {
		// non-fatal — install_name_tool may not be available in all environments
	}

	writeFileSync(
		join(clapBundlePath, "Contents", "Info.plist"),
		`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleName</key><string>${PLUGIN_BASENAME}</string>
	<key>CFBundleExecutable</key><string>${PLUGIN_BASENAME}</string>
	<key>CFBundleIdentifier</key><string>${CLAP_BUNDLE_ID}</string>
	<key>CFBundleVersion</key><string>${PLUGIN_VERSION}</string>
	<key>CFBundleShortVersionString</key><string>${PLUGIN_VERSION}</string>
	<key>CFBundlePackageType</key><string>BNDL</string>
	<key>CFBundleSignature</key><string>????</string>
</dict>
</plist>`,
	);
	writeFileSync(join(clapBundlePath, "Contents", "PkgInfo"), "BNDL????");

	console.log(`==> Created ${clapBundlePath}`);
	return clapBundlePath;
}

/** Build AUv2 .component via clap-wrapper cmake. */
function buildAuv2Wrapper(clapBundlePath, profile, outRoot) {
	const wrapperDir = join(
		ROOT,
		"packages",
		"cosmo-pd101-plugin",
		"au-wrapper",
	);
	const buildDir = join(outRoot, "au-wrapper", profile);
	const cmakeBuildType = profile === "release" ? "Release" : "Debug";

	run(
		`cmake -B "${buildDir}" -S "${wrapperDir}" -DCLAP_PATH="${clapBundlePath}" -DCMAKE_BUILD_TYPE=${cmakeBuildType}`,
	);
	run(`cmake --build "${buildDir}" --config ${cmakeBuildType}`);

	const componentPath = join(buildDir, `${PLUGIN_BASENAME}.component`);
	if (existsSync(componentPath)) {
		console.log(`==> Created ${componentPath}`);
	} else {
		console.warn(
			`==> AUv2 component not found at expected path ${componentPath}; check cmake output above`,
		);
	}
}


console.log(
	`==> Building ${PLUGIN_BASENAME} plugin (${profile}) for ${targetPlatform}, arch=${archArg}`,
);

if (targetPlatform === "macos") {
	// nih-plug AUv2 is handled via clap-wrapper cmake, NOT via the xtask ObjC path.
	const shouldBuildAuv2 =
		args.includes("--auv2") || process.env.BUILD_AUV2 === "1";
	const buildAuv3 = args.includes("--auv3") || process.env.BUILD_AUV3 === "1";

	// Step 1: Build VST3 (and CLAP entry points) via xtask
	const xtaskFormatFlags = ["--vst3"];
	if (buildAuv3) xtaskFormatFlags.push("--auv3");

	if (archArg === "universal") {
		ensureRustTarget("x86_64-apple-darwin");
		ensureRustTarget("aarch64-apple-darwin");
	} else if (archArg === "x86_64") {
		ensureRustTarget("x86_64-apple-darwin");
	} else if (archArg === "arm64") {
		ensureRustTarget("aarch64-apple-darwin");
	}

	run(
		`cargo run --target-dir packages/xtask/target -p xtask -- bundle cosmo-pd101-plugin ${xtaskFormatFlags.join(" ")} --arch ${archArg} ${profileArg}`.trim(),
	);

	// Step 2: Package .clap bundle (same dylib, nih_export_clap! always compiled)
	const outRoot = targetRoot();
	const clapBundlePath = buildClapBundle(archArg, profile, outRoot);

	// Step 3: AUv2 via clap-wrapper cmake
	if (shouldBuildAuv2) {
		buildAuv2Wrapper(clapBundlePath, profile, outRoot);
	}
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

console.log(
	`==> Done. Bundles are in packages/cosmo-pd101-plugin/target/${profile}/`,
);
