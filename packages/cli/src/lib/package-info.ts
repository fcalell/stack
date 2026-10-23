// Locates an installed npm package by name and returns its root directory + parsed package.json.
// Tries the consumer cwd's resolver first, then falls back to the CLI's own resolution scope so workspace dev (with symlinked node_modules) works.

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

export interface PackageInfo {
	root: string;
	pkgJson: {
		exports?: Record<string, unknown>;
		name?: string;
	};
}

// Memoized: within a CLI process, package resolution is stable, so we
// avoid repeating the require.resolve + filesystem walk for any package
// we've already looked up.
const cache = new Map<string, PackageInfo | null>();

export function findPackageInfo(pkg: string): PackageInfo | null {
	const cached = cache.get(pkg);
	if (cached !== undefined) return cached;
	for (const make of [
		() => createRequire(join(process.cwd(), "package.json")),
		() => createRequire(import.meta.url),
	]) {
		try {
			const req = make();
			const mainPath = req.resolve(pkg);
			const info = walkUpToPackageJson(mainPath, pkg);
			if (info) {
				cache.set(pkg, info);
				return info;
			}
		} catch {}
	}
	cache.set(pkg, null);
	return null;
}

function walkUpToPackageJson(
	startPath: string,
	pkg: string,
): PackageInfo | null {
	let dir = dirname(startPath);
	for (let i = 0; i < 15; i++) {
		const candidate = join(dir, "package.json");
		if (existsSync(candidate)) {
			try {
				const parsed = JSON.parse(readFileSync(candidate, "utf-8")) as {
					name?: string;
					exports?: Record<string, unknown>;
				};
				if (parsed.name === pkg) return { root: dir, pkgJson: parsed };
			} catch {}
		}
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
	return null;
}
