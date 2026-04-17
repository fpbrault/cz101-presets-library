#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PLATFORM_ALIASES = new Map([
	["darwin", "macos"],
	["macos", "macos"],
	["win32", "windows"],
	["windows", "windows"],
	["linux", "linux"],
]);

const PLUGIN_PACKAGE = "cosmo-pd101";

function toPascalCase(name) {
	return name
		.split(/[-_]/g)
		.filter(Boolean)
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join("");
}

function parseArgs() {
	const args = process.argv.slice(2);
	let profile = "release";
	let platform = PLATFORM_ALIASES.get(process.platform) ?? process.platform;

	for (let i = 0; i < args.length; i += 1) {
		if (args[i] === "--profile" && args[i + 1]) {
			profile = args[i + 1];
			i += 1;
			continue;
		}

		if (args[i] === "--platform" && args[i + 1]) {
			const normalized = PLATFORM_ALIASES.get(args[i + 1].toLowerCase());
			if (!normalized) {
				throw new Error(
					`Unsupported platform '${args[i + 1]}'. Use one of: macos, windows, linux.`,
				);
			}
			platform = normalized;
			i += 1;
		}
	}

	return { profile, platform };
}

function readWorkspaceVersion(rootDir) {
	const cargoToml = readFileSync(path.join(rootDir, "Cargo.toml"), "utf8");
	const workspacePkgIndex = cargoToml.indexOf("[workspace.package]");
	if (workspacePkgIndex < 0) {
		throw new Error("Could not find [workspace.package] in Cargo.toml");
	}

	const after = cargoToml.slice(workspacePkgIndex);
	const match = after.match(/version\s*=\s*"([^"]+)"/);
	if (!match) {
		throw new Error("Could not find workspace version in Cargo.toml");
	}

	return match[1];
}

function run(cmd, args, opts = {}) {
	const result = spawnSync(cmd, args, {
		cwd: opts.cwd,
		stdio: "inherit",
		env: opts.env ?? process.env,
	});

	if (result.status !== 0) {
		throw new Error(
			`${cmd} ${args.join(" ")} failed with exit code ${result.status}`,
		);
	}
}

function resolveTargetRoot(rootDir) {
	const fromEnv = process.env.CARGO_TARGET_DIR;
	if (!fromEnv) {
		return path.join(rootDir, "packages", "cosmo-pd101", "target");
	}

	if (path.isAbsolute(fromEnv)) {
		return fromEnv;
	}

	return path.join(rootDir, fromEnv);
}

function ensureDir(dirPath) {
	mkdirSync(dirPath, { recursive: true });
}

function writeText(filePath, content) {
	writeFileSync(filePath, content, "utf8");
}

function stagePluginBundle(sourceDir, destDir) {
	if (!existsSync(sourceDir)) {
		throw new Error(`Expected plugin bundle at ${sourceDir}`);
	}

	ensureDir(path.dirname(destDir));
	cpSync(sourceDir, destDir, { recursive: true });
}

function assertBundleContainsFile(bundleDir, relativeFilePath, platformLabel) {
	const expectedPath = path.join(bundleDir, ...relativeFilePath.split("/"));
	if (!existsSync(expectedPath)) {
		throw new Error(
			`${platformLabel} bundle mismatch: expected ${relativeFilePath} inside ${path.basename(bundleDir)}. Build that platform's plugin artifact first.`,
		);
	}
}

function detectArchBundleDirs(bundleDir, platformKind) {
	const contentsDir = path.join(bundleDir, "Contents");
	if (!existsSync(contentsDir)) {
		throw new Error(
			`Expected Contents directory in ${path.basename(bundleDir)}.`,
		);
	}

	const suffix = platformKind === "windows" ? "-win" : "-linux";
	const dirs = readdirSync(contentsDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && entry.name.endsWith(suffix))
		.map((entry) => entry.name)
		.sort();

	if (dirs.length === 0) {
		throw new Error(
			`${platformKind} packaging expected at least one Contents/*${suffix} architecture folder in ${path.basename(bundleDir)}. Build that platform's plugin artifact first.`,
		);
	}

	return dirs;
}

function packageMacos({ sourceDir, outputDir, version }) {
	const pluginBaseName =
		process.env.PLUGIN_BASENAME ?? toPascalCase(PLUGIN_PACKAGE);
	const bundleVst3Name = `${pluginBaseName}.vst3`;
	const bundleAuv2Name = `${pluginBaseName}.component`;
	const bundleVst3 = path.join(sourceDir, bundleVst3Name);
	const bundleAuv2 = path.join(sourceDir, bundleAuv2Name);

	if (!existsSync(bundleVst3) || !existsSync(bundleAuv2)) {
		throw new Error(
			`macOS packaging requires ${bundleVst3Name} and ${bundleAuv2Name}. Run plugin build first.`,
		);
	}

	assertBundleContainsFile(
		bundleVst3,
		`Contents/MacOS/${pluginBaseName}`,
		"macOS",
	);

	const packageBaseName = `cosmo-plugins-macos-universal-v${version}`;
	const stagingRoot = path.join(outputDir, "staging");
	const payloadVst3Root = path.join(stagingRoot, "payload-vst3");
	const payloadAuv2Root = path.join(stagingRoot, "payload-auv2");
	const pkgOut = path.join(outputDir, `${packageBaseName}.pkg`);
	const zipOut = path.join(outputDir, `${packageBaseName}.zip`);
	const vst3ComponentPkg = path.join(outputDir, `${packageBaseName}-vst3.pkg`);
	const auv2ComponentPkg = path.join(outputDir, `${packageBaseName}-auv2.pkg`);
	const distributionXml = path.join(stagingRoot, "Distribution.xml");

	rmSync(stagingRoot, { recursive: true, force: true });

	stagePluginBundle(bundleVst3, path.join(payloadVst3Root, bundleVst3Name));
	stagePluginBundle(bundleAuv2, path.join(payloadAuv2Root, bundleAuv2Name));

	const readme = [
		"CosmoPd101 Plugin Installer (macOS universal)",
		"",
		"The PKG installer lets you choose what to install:",
		"- VST3 only",
		"- AUv2 only",
		"- Both VST3 and AUv2",
		"",
		"Installs:",
		`- /Library/Audio/Plug-Ins/VST3/${bundleVst3Name}`,
		`- /Library/Audio/Plug-Ins/Components/${bundleAuv2Name}`,
	].join("\n");
	writeText(path.join(stagingRoot, "README.txt"), readme);

	rmSync(pkgOut, { force: true });
	rmSync(vst3ComponentPkg, { force: true });
	rmSync(auv2ComponentPkg, { force: true });
	rmSync(zipOut, { force: true });

	run("pkgbuild", [
		"--root",
		payloadVst3Root,
		"--identifier",
		"com.cz101.presets.plugins.vst3",
		"--version",
		version,
		"--install-location",
		"/Library/Audio/Plug-Ins/VST3",
		vst3ComponentPkg,
	]);

	run("pkgbuild", [
		"--root",
		payloadAuv2Root,
		"--identifier",
		"com.cz101.presets.plugins.auv2",
		"--version",
		version,
		"--install-location",
		"/Library/Audio/Plug-Ins/Components",
		auv2ComponentPkg,
	]);

	const distribution = `<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="1">
  <title>${pluginBaseName} Plugins</title>
  <options customize="always" require-scripts="false"/>
  <choices-outline>
    <line choice="choice_vst3"/>
    <line choice="choice_auv2"/>
  </choices-outline>
  <choice id="choice_vst3" title="VST3 Plugin" description="Install ${bundleVst3Name}" start_selected="true">
    <pkg-ref id="com.cz101.presets.plugins.vst3"/>
  </choice>
  <choice id="choice_auv2" title="Audio Unit (AUv2) Plugin" description="Install ${bundleAuv2Name}" start_selected="true">
    <pkg-ref id="com.cz101.presets.plugins.auv2"/>
  </choice>
  <pkg-ref id="com.cz101.presets.plugins.vst3" version="${version}">${path.basename(vst3ComponentPkg)}</pkg-ref>
  <pkg-ref id="com.cz101.presets.plugins.auv2" version="${version}">${path.basename(auv2ComponentPkg)}</pkg-ref>
</installer-gui-script>
`;
	writeText(distributionXml, distribution);

	run("productbuild", [
		"--distribution",
		distributionXml,
		"--package-path",
		outputDir,
		pkgOut,
	]);
	run("ditto", ["-c", "-k", "--keepParent", stagingRoot, zipOut]);

	rmSync(vst3ComponentPkg, { force: true });
	rmSync(auv2ComponentPkg, { force: true });

	return [pkgOut, zipOut];
}

function packageWindows({ sourceDir, outputDir, version }) {
	const pluginBaseName =
		process.env.PLUGIN_BASENAME ?? toPascalCase(PLUGIN_PACKAGE);
	const bundleVst3Name = `${pluginBaseName}.vst3`;
	const bundleVst3 = path.join(sourceDir, bundleVst3Name);
	if (!existsSync(bundleVst3)) {
		throw new Error(
			`Windows packaging requires ${bundleVst3Name}. Run plugin build first.`,
		);
	}

	const archDirs = detectArchBundleDirs(bundleVst3, "windows");
	for (const archDir of archDirs) {
		assertBundleContainsFile(
			bundleVst3,
			`Contents/${archDir}/${bundleVst3Name}`,
			"Windows",
		);
	}

	const archLabel = archDirs.join("+");
	const packageBaseName = `cz101-plugins-windows-${archLabel}-v${version}`;
	const stagingRoot = path.join(outputDir, packageBaseName);
	const zipOut = path.join(outputDir, `${packageBaseName}.zip`);

	rmSync(stagingRoot, { recursive: true, force: true });
	rmSync(zipOut, { force: true });

	stagePluginBundle(
		bundleVst3,
		path.join(stagingRoot, "plugins", "VST3", bundleVst3Name),
	);

	writeText(
		path.join(stagingRoot, "install.ps1"),
		[
			"$ErrorActionPreference = 'Stop'",
			"$installVst = Read-Host 'Install VST3 plugin? (Y/n)'",
			"if ($installVst -match '^[Nn]') { Write-Host 'No plugin selected. Exiting.'; exit 0 }",
			`$src = Join-Path $PSScriptRoot 'plugins\\VST3\\${bundleVst3Name}'`,
			`$dst = Join-Path \${env:COMMONPROGRAMFILES} 'VST3\\${bundleVst3Name}'`,
			"if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }",
			"Copy-Item $src $dst -Recurse -Force",
			'Write-Host "Installed $dst"',
		].join("\r\n"),
	);

	writeText(
		path.join(stagingRoot, "uninstall.ps1"),
		[
			"$ErrorActionPreference = 'Stop'",
			`$dst = Join-Path \${env:COMMONPROGRAMFILES} 'VST3\\${bundleVst3Name}'`,
			'if (Test-Path $dst) { Remove-Item $dst -Recurse -Force; Write-Host "Removed $dst" } else { Write-Host "Not installed" }',
		].join("\r\n"),
	);

	writeText(
		path.join(stagingRoot, "README.txt"),
		[
			"CosmoPd101 Plugin Installer Bundle (Windows)",
			"",
			`Included plugin architectures: ${archDirs.join(", ")}`,
			"",
			"1. Open PowerShell as Administrator.",
			"2. Run ./install.ps1 from this folder.",
			"3. The installer prompts what to install.",
		].join("\r\n"),
	);

	run("powershell", [
		"-NoProfile",
		"-Command",
		`Compress-Archive -Path '${stagingRoot}\\*' -DestinationPath '${zipOut}' -Force`,
	]);

	return [zipOut];
}

function packageLinux({ sourceDir, outputDir, version }) {
	const pluginBaseName =
		process.env.PLUGIN_BASENAME ?? toPascalCase(PLUGIN_PACKAGE);
	const bundleVst3Name = `${pluginBaseName}.vst3`;
	const bundleVst3 = path.join(sourceDir, bundleVst3Name);
	if (!existsSync(bundleVst3)) {
		throw new Error(
			`Linux packaging requires ${bundleVst3Name}. Run plugin build first.`,
		);
	}

	const archDirs = detectArchBundleDirs(bundleVst3, "linux");
	for (const archDir of archDirs) {
		assertBundleContainsFile(
			bundleVst3,
			`Contents/${archDir}/${pluginBaseName}.so`,
			"Linux",
		);
	}

	const archLabel = archDirs.join("+");
	const packageBaseName = `cz101-plugins-linux-${archLabel}-v${version}`;
	const stagingRoot = path.join(outputDir, packageBaseName);
	const archiveOut = path.join(outputDir, `${packageBaseName}.tar.gz`);

	rmSync(stagingRoot, { recursive: true, force: true });
	rmSync(archiveOut, { force: true });

	stagePluginBundle(
		bundleVst3,
		path.join(stagingRoot, "plugins", "vst3", bundleVst3Name),
	);

	writeText(
		path.join(stagingRoot, "install.sh"),
		[
			"#!/usr/bin/env bash",
			"set -euo pipefail",
			'answer=""',
			'read -r -p "Install VST3 plugin? [Y/n] " answer',
			'if [[ -z "$answer" ]]; then answer=Y; fi',
			'if [[ "$answer" =~ ^[Nn]$ ]]; then',
			'  echo "No plugin selected. Exiting."',
			"  exit 0",
			"fi",
			`SRC="$(cd "$(dirname "$BASH_SOURCE")" && pwd)/plugins/vst3/${bundleVst3Name}"`,
			`DST="$HOME/.vst3/${bundleVst3Name}"`,
			'mkdir -p "$(dirname "$DST")"',
			'rm -rf "$DST"',
			'cp -R "$SRC" "$DST"',
			'echo "Installed $DST"',
		].join("\n"),
	);

	writeText(
		path.join(stagingRoot, "uninstall.sh"),
		[
			"#!/usr/bin/env bash",
			"set -euo pipefail",
			`DST="$HOME/.vst3/${bundleVst3Name}"`,
			'rm -rf "$DST"',
			'echo "Removed $DST"',
		].join("\n"),
	);

	run("chmod", [
		"+x",
		path.join(stagingRoot, "install.sh"),
		path.join(stagingRoot, "uninstall.sh"),
	]);

	run("tar", ["-czf", archiveOut, "-C", outputDir, packageBaseName]);

	return [archiveOut];
}

function main() {
	const { profile, platform } = parseArgs();
	const scriptDir = path.dirname(fileURLToPath(import.meta.url));
	const rootDir = path.resolve(scriptDir, "..");
	const targetRoot = resolveTargetRoot(rootDir);
	const sourceDir = path.join(targetRoot, profile);
	const version = readWorkspaceVersion(rootDir);
	const outputDir = path.join(rootDir, "dist", "plugin-installers", platform);

	if (!existsSync(sourceDir)) {
		throw new Error(`Build output directory not found: ${sourceDir}`);
	}

	ensureDir(outputDir);

	let artifacts;
	if (platform === "macos") {
		artifacts = packageMacos({ sourceDir, outputDir, version });
	} else if (platform === "windows") {
		artifacts = packageWindows({ sourceDir, outputDir, version });
	} else if (platform === "linux") {
		artifacts = packageLinux({ sourceDir, outputDir, version });
	} else {
		throw new Error(`Unsupported platform '${platform}'`);
	}

	console.log("Plugin installer artifacts:");
	for (const artifact of artifacts) {
		console.log(`- ${artifact}`);
	}
}

main();
