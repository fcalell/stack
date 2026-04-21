import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

// ── Runtime-export discovery ────────────────────────────────────────
//
// Shared helper: returns true if the given npm package declares a
// `./runtime` subpath export. Used by both the CLI (to decide whether a
// worker entry is needed at all) and plugin-api (to gate its Worker/
// Middleware/Generate handlers). Lives in core — both consumers need it
// and it has no domain dependency.

export function hasRuntimeExport(packageName: string): boolean {
	const pkg = readPackageJson(packageName);
	return !!pkg?.exports?.["./runtime"];
}

function readPackageJson(
	packageName: string,
): { exports?: Record<string, unknown> } | null {
	for (const reqFn of [
		requireFromSelf,
		() => createRequire(join(process.cwd(), "package.json")),
	]) {
		try {
			const req = reqFn();
			const mainPath = req.resolve(packageName);
			return readJsonWalkingUp(mainPath);
		} catch {}
	}
	return null;
}

function requireFromSelf(): NodeJS.Require {
	return createRequire(import.meta.url);
}

function readJsonWalkingUp(
	startPath: string,
): { exports?: Record<string, unknown> } | null {
	let dir = join(startPath, "..");
	for (let i = 0; i < 10; i++) {
		const candidate = join(dir, "package.json");
		if (existsSync(candidate)) {
			return JSON.parse(readFileSync(candidate, "utf-8"));
		}
		const parent = join(dir, "..");
		if (parent === dir) return null;
		dir = parent;
	}
	return null;
}
