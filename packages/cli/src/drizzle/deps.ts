import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const resolve = createRequire(join(process.cwd(), "_")).resolve;

function isInstalled(pkg: string): boolean {
	try {
		resolve(pkg);
		return true;
	} catch {
		return false;
	}
}

export function ensureDeps(configPath: string): void {
	const text = readFileSync(configPath, "utf-8");
	const needed = new Set<string>();

	if (/\bauth\s*:/.test(text)) {
		for (const pkg of ["better-auth", "@better-auth/cli", "better-sqlite3"]) {
			needed.add(pkg);
		}
	}

	if (/["']sqlite["']/.test(text)) {
		needed.add("better-sqlite3");
	}

	// Always ensure drizzle-kit is available
	needed.add("drizzle-kit");

	const missing = [...needed].filter((pkg) => !isInstalled(pkg));
	if (missing.length === 0) return;

	console.log(`Installing dependencies: ${missing.join(", ")}`);
	const result = spawnSync("pnpm", ["add", "-D", ...missing], {
		stdio: "inherit",
		cwd: process.cwd(),
	});

	if (result.status !== 0) {
		console.error("Failed to install dependencies.");
		process.exit(1);
	}
}
