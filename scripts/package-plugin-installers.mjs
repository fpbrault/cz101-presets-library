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

	if (result.error) {
		throw new Error(
			`${cmd} ${args.join(" ")} failed to start: ${result.error.message}`,
		);
	}

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

function toWindowsPath(filePath) {
	return filePath.replaceAll("/", "\\");
}

function escapeNsisString(value) {
	return value.replaceAll("$", "$$").replaceAll('"', '$\\"');
}

function resolveMakensisCommand() {
	if (process.platform !== "win32") {
		return "makensis";
	}

	const candidates = [
		path.join("C:", "ProgramData", "chocolatey", "bin", "makensis.exe"),
		path.join("C:", "Program Files (x86)", "NSIS", "makensis.exe"),
		path.join("C:", "Program Files", "NSIS", "makensis.exe"),
	];

	const programFilesX86 = process.env["ProgramFiles(x86)"];
	if (programFilesX86) {
		candidates.unshift(path.join(programFilesX86, "NSIS", "makensis.exe"));
	}

	const programFiles = process.env.ProgramFiles;
	if (programFiles) {
		candidates.unshift(path.join(programFiles, "NSIS", "makensis.exe"));
	}

	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	const whereResult = spawnSync("where.exe", ["makensis.exe"], {
		stdio: ["ignore", "pipe", "ignore"],
		encoding: "utf8",
		env: process.env,
	});

	if (whereResult.status === 0) {
		const resolvedPath = whereResult.stdout
			.split(/\r?\n/)
			.map((line) => line.trim())
			.find(Boolean);

		if (resolvedPath) {
			return resolvedPath;
		}
	}

	throw new Error(
		[
			"Windows plugin packaging requires NSIS, but makensis.exe was not found.",
			"Install NSIS, then rerun the packaging command.",
			"Recommended install commands:",
			"- winget install NSIS.NSIS",
			"- choco install nsis -y",
		].join("\n"),
	);
}

function stagePluginBundle(sourceDir, destDir) {
	if (!existsSync(sourceDir)) {
		throw new Error(`Expected plugin bundle at ${sourceDir}`);
	}

	ensureDir(path.dirname(destDir));
	cpSync(sourceDir, destDir, { recursive: true });
}

function packageBareMacosBundle(
	sourceDir,
	outputDir,
	version,
	bundleName,
	formatLabel,
) {
	const archiveBaseName = `cosmo-pd101-plugin-macos-universal-v${version}-${formatLabel}.zip`;
	const archiveOut = path.join(outputDir, archiveBaseName);
	const bundlePath = path.join(sourceDir, bundleName);
	rmSync(archiveOut, { force: true });
	run("ditto", ["-c", "-k", "--keepParent", bundlePath, archiveOut]);
	return archiveOut;
}

function packageBareWindowsBundle(
	sourceDir,
	outputDir,
	version,
	bundleName,
	archLabel,
) {
	const archiveBaseName = `cosmo-pd101-plugin-windows-${archLabel}-v${version}-vst3.zip`;
	const archiveOut = path.join(outputDir, archiveBaseName);
	const bundlePath = path.join(sourceDir, bundleName);
	rmSync(archiveOut, { force: true });
	run("powershell", [
		"-NoProfile",
		"-Command",
		`Compress-Archive -Path '${bundlePath}' -DestinationPath '${archiveOut}' -Force`,
	]);
	return archiveOut;
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
		"com.cosmo.pd101.plugins.vst3",
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
		"com.cosmo.pd101.plugins.auv2",
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
    <pkg-ref id="com.cosmo.pd101.plugins.vst3"/>
  </choice>
  <choice id="choice_auv2" title="Audio Unit (AUv2) Plugin" description="Install ${bundleAuv2Name}" start_selected="true">
    <pkg-ref id="com.cosmo.pd101.plugins.auv2"/>
  </choice>
  <pkg-ref id="com.cosmo.pd101.plugins.vst3" version="${version}">${path.basename(vst3ComponentPkg)}</pkg-ref>
  <pkg-ref id="com.cosmo.pd101.plugins.auv2" version="${version}">${path.basename(auv2ComponentPkg)}</pkg-ref>
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

	const bareVst3Zip = packageBareMacosBundle(
		sourceDir,
		outputDir,
		version,
		bundleVst3Name,
		"vst3",
	);
	const bareAuv2Zip = packageBareMacosBundle(
		sourceDir,
		outputDir,
		version,
		bundleAuv2Name,
		"auv2",
	);

	return [pkgOut, zipOut, bareVst3Zip, bareAuv2Zip];
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
	const packageBaseName = `cosmo-pd101-plugin-windows-${archLabel}-v${version}`;
	const stagingRoot = path.join(outputDir, packageBaseName);
	const payloadRoot = path.join(stagingRoot, "payload");
	const installerScriptPath = path.join(stagingRoot, `${packageBaseName}.nsi`);
	const exeOut = path.join(outputDir, `${packageBaseName}.exe`);
	const productName = `${pluginBaseName} Plugin`;
	const uninstallExeName = `${productName} Uninstall.exe`;
	const uninstallRegistryKey = `Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${productName}`;

	rmSync(stagingRoot, { recursive: true, force: true });
	rmSync(exeOut, { force: true });

	stagePluginBundle(bundleVst3, path.join(payloadRoot, bundleVst3Name));

	const nsisScript = [
		"Unicode True",
		"RequestExecutionLevel admin",
		`Name "${escapeNsisString(productName)}"`,
		`OutFile "${escapeNsisString(toWindowsPath(exeOut))}"`,
		'InstallDir "$COMMONFILES64\\VST3"',
		"ShowInstDetails show",
		"ShowUnInstDetails show",
		"",
		'VIProductVersion "1.0.0.0"',
		`VIAddVersionKey "ProductName" "${escapeNsisString(productName)}"`,
		`VIAddVersionKey "ProductVersion" "${escapeNsisString(version)}"`,
		`VIAddVersionKey "CompanyName" "${escapeNsisString(pluginBaseName)}"`,
		'VIAddVersionKey "FileDescription" "VST3 plugin installer"',
		"",
		"Page directory",
		"Page instfiles",
		"UninstPage uninstConfirm",
		"UninstPage instfiles",
		"",
		'Section "Install VST3 Plugin" SEC_MAIN',
		"  SetShellVarContext all",
		'  SetOutPath "$INSTDIR"',
		`  File /r "${escapeNsisString(toWindowsPath(path.join(payloadRoot, bundleVst3Name)))}"`,
		`  WriteUninstaller "$INSTDIR\\${escapeNsisString(uninstallExeName)}"`,
		`  WriteRegStr HKLM "${escapeNsisString(uninstallRegistryKey)}" "DisplayName" "${escapeNsisString(productName)}"`,
		`  WriteRegStr HKLM "${escapeNsisString(uninstallRegistryKey)}" "DisplayVersion" "${escapeNsisString(version)}"`,
		`  WriteRegStr HKLM "${escapeNsisString(uninstallRegistryKey)}" "Publisher" "${escapeNsisString(pluginBaseName)}"`,
		`  WriteRegStr HKLM "${escapeNsisString(uninstallRegistryKey)}" "UninstallString" "$INSTDIR\\${escapeNsisString(uninstallExeName)}"`,
		`  WriteRegStr HKLM "${escapeNsisString(uninstallRegistryKey)}" "QuietUninstallString" "$INSTDIR\\${escapeNsisString(uninstallExeName)} /S"`,
		`  WriteRegDWORD HKLM "${escapeNsisString(uninstallRegistryKey)}" "NoModify" 1`,
		`  WriteRegDWORD HKLM "${escapeNsisString(uninstallRegistryKey)}" "NoRepair" 1`,
		`  DetailPrint "Installed architectures: ${escapeNsisString(archDirs.join(", "))}"`,
		"SectionEnd",
		"",
		'Section "Uninstall"',
		"  SetShellVarContext all",
		`  Delete "$INSTDIR\\${escapeNsisString(uninstallExeName)}"`,
		`  RMDir /r "$INSTDIR\\${escapeNsisString(bundleVst3Name)}"`,
		`  DeleteRegKey HKLM "${escapeNsisString(uninstallRegistryKey)}"`,
		"SectionEnd",
	].join("\r\n");

	writeText(installerScriptPath, nsisScript);
	run(resolveMakensisCommand(), ["/V2", installerScriptPath]);

	const barePluginZip = packageBareWindowsBundle(
		sourceDir,
		outputDir,
		version,
		bundleVst3Name,
		archLabel,
	);

	return [exeOut, barePluginZip];
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
	const packageBaseName = `cosmo-pd101-plugin-linux-${archLabel}-v${version}`;
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
