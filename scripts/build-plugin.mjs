#!/usr/bin/env node
/**
 * Cross-platform replacement for build-plugin.sh
 * Usage: bun run scripts/build-plugin.mjs [--release] [--arch native|arm64|x86_64|universal|all] [--platform macos|windows|linux] [--auv2] [--auv3]
 *
 * macOS note: VST3 is built via the custom xtask. CLAP and AU wrapper inputs are
 * built as separate dylibs so each format can use distinct macOS WebView class names.
 * AUv2 is built separately via clap-wrapper cmake (packages/cosmo-pd101-plugin/au-wrapper/).
 */

import { execSync } from "node:child_process";
import {
	copyFileSync,
	cpSync,
	existsSync,
	mkdirSync,
	renameSync,
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
const OBJC_CLASS_PREFIXES = {
	vst3: `${PLUGIN_BASENAME}Vst3`,
	clap: `${PLUGIN_BASENAME}Clap`,
	auv2: `${PLUGIN_BASENAME}Auv2`,
};
// Each format uses a unique WKWebView custom URL scheme so that loading two
// different plugin formats in the same host process does not cause a scheme
// handler registration collision (which would make the second format load
// about:blank instead of the plugin UI).
const CUSTOM_SCHEME_NAMES = {
	vst3: "cz-vst3",
	clap: "cz-clap",
	auv2: "cz-auv2",
};

function run(cmd, env = process.env) {
	console.log(`==> ${cmd}`);
	execSync(cmd, { stdio: "inherit", cwd: ROOT, env });
}

function runWithObjcClassPrefix(
	cmd,
	objcClassPrefix,
	customScheme,
	env = process.env,
) {
	run(cmd, {
		...env,
		WRY_OBJC_CLASS_PREFIX: objcClassPrefix,
		WRY_CUSTOM_SCHEME: customScheme,
	});
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

function buildMacosPluginDylib(
	requestedArch,
	profileValue,
	profileArgValue,
	outRoot,
	objcClassPrefix,
	customScheme,
	artifactLabel,
) {
	const outputPath = join(
		outRoot,
		profileValue,
		`lib${LIB_CRATE_NAME}-${artifactLabel}.dylib`,
	);
	rmSync(outputPath, { force: true });

	if (requestedArch === "universal") {
		const triples = ["aarch64-apple-darwin", "x86_64-apple-darwin"];
		for (const triple of triples) {
			ensureRustTarget(triple);
			runWithObjcClassPrefix(
				`cargo build -p cosmo-pd101-plugin --target ${triple} ${profileArgValue}`.trim(),
				objcClassPrefix,
				customScheme,
				{
					...process.env,
					CARGO_TARGET_DIR: outRoot,
				},
			);
		}

		const arm64Dylib = join(
			outRoot,
			"aarch64-apple-darwin",
			profileValue,
			`lib${LIB_CRATE_NAME}.dylib`,
		);
		const x86Dylib = join(
			outRoot,
			"x86_64-apple-darwin",
			profileValue,
			`lib${LIB_CRATE_NAME}.dylib`,
		);
		run(`lipo -create -output "${outputPath}" "${arm64Dylib}" "${x86Dylib}"`);
		return outputPath;
	}

	const triple = archArgToAppleTriple(requestedArch);
	ensureRustTarget(triple);
	runWithObjcClassPrefix(
		`cargo build -p cosmo-pd101-plugin --target ${triple} ${profileArgValue}`.trim(),
		objcClassPrefix,
		customScheme,
		{
			...process.env,
			CARGO_TARGET_DIR: outRoot,
		},
	);

	const builtDylib = join(
		outRoot,
		triple,
		profileValue,
		`lib${LIB_CRATE_NAME}.dylib`,
	);
	copyFileSync(builtDylib, outputPath);
	return outputPath;
}

/** Build the plugin webview (cosmo-pd101 lib-dist + plugin webview). */
function buildWebview() {
	const webviewDir = join(ROOT, "packages", "cosmo-pd101-plugin", "webview");
	console.log("==> Building plugin webview...");
	// The webview's prebuild hook runs `bun --filter @cosmo/cosmo-pd101 build:lib` automatically.
	execSync("bun run build", { stdio: "inherit", cwd: webviewDir });
}

/** Copy the built webview dist into a plugin bundle's Resources/ui/. */
function copyWebviewAssets(bundleContentsDir) {
	const webviewDist = join(
		ROOT,
		"packages",
		"cosmo-pd101-plugin",
		"webview",
		"dist",
	);
	if (!existsSync(webviewDist)) {
		throw new Error(
			`Webview dist not found at ${webviewDist} — run buildWebview() first`,
		);
	}
	const dest = join(bundleContentsDir, "Resources", "ui");
	rmSync(dest, { recursive: true, force: true });
	mkdirSync(dest, { recursive: true });
	cpSync(webviewDist, dest, { recursive: true });
	console.log(`==> Copied webview assets → ${dest}`);
}

/** Build and package a .clap bundle from an explicit dylib artifact. */
function buildClapBundle(
	dylibPath,
	outRoot,
	profile,
	bundleName = `${PLUGIN_BASENAME}.clap`,
) {
	const clapBundlePath = join(outRoot, profile, bundleName);
	const clapBinaryDir = join(clapBundlePath, "Contents", "MacOS");
	const clapBinaryPath = join(clapBinaryDir, PLUGIN_BASENAME);

	rmSync(clapBundlePath, { recursive: true, force: true });
	mkdirSync(clapBinaryDir, { recursive: true });

	if (!existsSync(dylibPath)) {
		throw new Error(`CLAP dylib not found at ${dylibPath}`);
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

	copyWebviewAssets(join(clapBundlePath, "Contents"));
	console.log(`==> Created ${clapBundlePath}`);
	return clapBundlePath;
}

/** Build AUv2 .component via clap-wrapper cmake. */
function buildAuv2Wrapper(clapBundlePath, profile, outRoot) {
	const wrapperDir = join(ROOT, "packages", "cosmo-pd101-plugin", "au-wrapper");
	const buildDir = join(outRoot, "au-wrapper", profile);
	const cmakeBuildType = profile === "release" ? "Release" : "Debug";

	run(
		`cmake -B "${buildDir}" -S "${wrapperDir}" -DCLAP_PATH="${clapBundlePath}" -DCMAKE_BUILD_TYPE=${cmakeBuildType}`,
	);
	run(`cmake --build "${buildDir}" --config ${cmakeBuildType}`);

	const componentPath = join(buildDir, `${PLUGIN_BASENAME}.component`);
	if (!existsSync(componentPath)) {
		console.warn(
			`==> AUv2 component not found at expected path ${componentPath}; check cmake output above`,
		);
		return;
	}

	// cmake's PRE_BUILD copy races with MACOSX_BUNDLE default plist generation.
	// The build-helper generates the correct plist (with AudioComponents) in its
	// output dir — copy it into the bundle now, after the build is complete.
	const auv2TargetName = `${PLUGIN_BASENAME}AUv2`;
	const generatedPlist = join(
		buildDir,
		`${auv2TargetName}-build-helper-output`,
		"auv2_Info.plist",
	);
	const bundlePlist = join(componentPath, "Contents", "Info.plist");
	if (existsSync(generatedPlist)) {
		copyFileSync(generatedPlist, bundlePlist);
		console.log(`==> Patched AUv2 Info.plist with AudioComponents`);
	} else {
		console.warn(
			`==> auv2_Info.plist not found at ${generatedPlist}; AU may not register`,
		);
	}

	copyWebviewAssets(join(componentPath, "Contents"));

	// The clap-wrapper embeds the .clap inside the .component at
	// Contents/PlugIns/<name>.clap/. When the CLAP dylib resolves its own path
	// via dladdr, it sees the embedded .clap path, not the outer .component path.
	// Copy webview assets into the embedded CLAP bundle so the walk-up search finds them.
	const embeddedClapContents = join(
		componentPath,
		"Contents",
		"PlugIns",
		`${PLUGIN_BASENAME}.clap`,
		"Contents",
	);
	if (existsSync(embeddedClapContents)) {
		// cmake incremental builds may skip re-copying the CLAP binary into the embedded
		// location even when the dylib has been recompiled. Force-update it to ensure
		// the embedded CLAP always contains the latest build.
		const embeddedClapBinary = join(
			embeddedClapContents,
			"MacOS",
			PLUGIN_BASENAME,
		);
		const sourceClapBinary = join(
			clapBundlePath,
			"Contents",
			"MacOS",
			PLUGIN_BASENAME,
		);
		if (existsSync(embeddedClapBinary) && existsSync(sourceClapBinary)) {
			copyFileSync(sourceClapBinary, embeddedClapBinary);
			console.log(`==> Force-updated embedded CLAP binary`);
		}
		copyWebviewAssets(embeddedClapContents);
		console.log(`==> Copied webview assets into embedded CLAP bundle`);
	}

	// Publish AUv2 component next to other artifacts in target/<profile>/ so
	// installer scripts can consume a single directory for VST3/CLAP/AUv2.
	const publishedComponentPath = join(
		outRoot,
		profile,
		`${PLUGIN_BASENAME}.component`,
	);
	rmSync(publishedComponentPath, { recursive: true, force: true });
	cpSync(componentPath, publishedComponentPath, { recursive: true });
	console.log(`==> Published AUv2 component → ${publishedComponentPath}`);

	console.log(`==> Created ${componentPath}`);
}

console.log(
	`==> Building ${PLUGIN_BASENAME} plugin (${profile}) for ${targetPlatform}, arch=${archArg}`,
);

if (targetPlatform === "macos") {
	// nih-plug AUv2 is handled via clap-wrapper cmake, NOT via the xtask ObjC path.
	const shouldBuildAuv2 =
		args.includes("--auv2") || process.env.BUILD_AUV2 === "1";
	const buildAuv3 = args.includes("--auv3") || process.env.BUILD_AUV3 === "1";
	const outRoot = targetRoot();

	// Step 1: Build plugin webview assets
	buildWebview();

	// Step 2: Build VST3 via xtask using a VST3-specific Objective-C class prefix
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

	runWithObjcClassPrefix(
		`cargo run --target-dir "${outRoot}" -p xtask -- bundle cosmo-pd101-plugin ${xtaskFormatFlags.join(" ")} --arch ${archArg} ${profileArg}`.trim(),
		OBJC_CLASS_PREFIXES.vst3,
		CUSTOM_SCHEME_NAMES.vst3,
	);

	// Copy webview assets into the VST3 bundle
	const canonicalVst3BundleName = `${PLUGIN_BASENAME}.vst3`;
	const legacyVst3BundleName = "CosmoPd101Plugin.vst3";
	const canonicalVst3BundlePath = join(
		outRoot,
		profile,
		canonicalVst3BundleName,
	);
	const legacyVst3BundlePath = join(outRoot, profile, legacyVst3BundleName);

	if (existsSync(legacyVst3BundlePath)) {
		rmSync(canonicalVst3BundlePath, { recursive: true, force: true });
		renameSync(legacyVst3BundlePath, canonicalVst3BundlePath);
		console.log(
			`==> Replaced VST3 bundle ${canonicalVst3BundleName} with fresh legacy output ${legacyVst3BundleName}`,
		);
	}

	if (!existsSync(canonicalVst3BundlePath)) {
		throw new Error(
			`Expected VST3 bundle at ${canonicalVst3BundlePath} (or legacy ${legacyVst3BundlePath}), but neither exists`,
		);
	}

	copyWebviewAssets(join(canonicalVst3BundlePath, "Contents"));

	// Step 3: Build and package CLAP with its own Objective-C class prefix
	const clapDylibPath = buildMacosPluginDylib(
		archArg,
		profile,
		profileArg,
		outRoot,
		OBJC_CLASS_PREFIXES.clap,
		CUSTOM_SCHEME_NAMES.clap,
		"clap",
	);
	buildClapBundle(clapDylibPath, outRoot, profile);

	// Step 4: AUv2 via clap-wrapper cmake using an AU-specific embedded CLAP binary
	if (shouldBuildAuv2) {
		const auClapDylibPath = buildMacosPluginDylib(
			archArg,
			profile,
			profileArg,
			outRoot,
			OBJC_CLASS_PREFIXES.auv2,
			CUSTOM_SCHEME_NAMES.auv2,
			"auv2",
		);
		const auClapBundlePath = buildClapBundle(
			auClapDylibPath,
			outRoot,
			profile,
			`${PLUGIN_BASENAME}-auv2-temp.clap`,
		);
		buildAuv2Wrapper(auClapBundlePath, profile, outRoot);
		rmSync(auClapBundlePath, { recursive: true, force: true });
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
