#!/usr/bin/env node
// Runs cargo fmt only on workspace packages under packages/*, excluding vendor.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

const check = process.argv.includes("--check");

const names = readdirSync("packages", { withFileTypes: true })
	.filter((d) => d.isDirectory())
	.flatMap((d) => {
		try {
			const content = readFileSync(`packages/${d.name}/Cargo.toml`, "utf8");
			// Only grab name from [package] sections, not [lib], [[bin]], etc.
			const packageSection =
				content.match(/\[package\]([\s\S]*?)(?=^\[|Z)/m)?.[1] ?? "";
			const name = packageSection.match(/^name\s*=\s*"([^"]+)"/m)?.[1];
			return name ? [name] : [];
		} catch {
			return [];
		}
	});

const args = ["fmt", ...names.flatMap((n) => ["-p", n])];
if (check) args.push("--", "--check");

execFileSync("cargo", args, { stdio: "inherit" });
