import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(cwd, "..");
const cosmoPd101WebviewRoot = path.resolve(
	packageRoot,
	"../cosmo-pd101",
);

const initialBuild = spawnSync("bun", ["run", "build:lib"], {
	cwd: cosmoPd101WebviewRoot,
	stdio: "inherit",
	shell: process.platform === "win32",
});

if (initialBuild.status !== 0) {
	process.exit(initialBuild.status ?? 1);
}

const run = (command, args, childCwd) => {
	const child = spawn(command, args, {
		cwd: childCwd,
		stdio: "inherit",
		shell: process.platform === "win32",
	});

	child.on("error", (error) => {
		console.error(`[dev] Failed to start ${command}:`, error);
		process.exitCode = 1;
	});

	return child;
};

const libWatcher = run(
	"bun",
	["run", "build:lib:watch"],
	cosmoPd101WebviewRoot,
);

const viteDev = run("bun", ["x", "vite"], packageRoot);

const shutdown = (signal = "SIGTERM") => {
	if (!libWatcher.killed) {
		libWatcher.kill(signal);
	}
	if (!viteDev.killed) {
		viteDev.kill(signal);
	}
};

process.on("SIGINT", () => {
	shutdown("SIGINT");
	process.exit(0);
});

process.on("SIGTERM", () => {
	shutdown("SIGTERM");
	process.exit(0);
});

libWatcher.on("exit", (code) => {
	if (code && code !== 0) {
		console.error(
			`[dev] cosmo-pd101 build:lib:watch exited with code ${code}.`,
		);
		shutdown();
		process.exit(code);
	}
});

viteDev.on("exit", (code) => {
	shutdown();
	process.exit(code ?? 0);
});
