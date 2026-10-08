import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, sep } from "node:path";

// The `exports` targets under `./src/`, found through a conditions object.
function sourceTargets(exports: unknown): string[] {
	if (typeof exports === "string") {
		return exports.startsWith("./src/") ? [exports] : [];
	}
	if (exports === null || typeof exports !== "object") return [];
	return Object.values(exports).flatMap(sourceTargets);
}

// The directory a source target serves: its own up to the segment holding a
// `*`, so `./src/ui/components/*/index.tsx` serves `src/ui/components`.
function servedDir(root: string, target: string): string {
	const parts = target.slice(2).split("/");
	const star = parts.findIndex((part) => part.includes("*"));
	return join(root, ...parts.slice(0, star === -1 ? -1 : star));
}

// The globs for everything under `dir` outside the served directories, with no
// negated glob (Vitest matches the triggers one by one).
function unserved(dir: string, served: string[]): string[] {
	if (served.some((s) => dir === s || dir.startsWith(s + sep))) return [];
	if (!served.some((s) => s.startsWith(dir + sep))) return [`${dir}/**`];
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory()
			? unserved(join(dir, entry.name), served)
			: [join(dir, entry.name)],
	);
}

// The directory a dependency resolves to from `cwd` when it is linked from
// outside `node_modules`, else null.
function linked(cwd: string, name: string): string | null {
	for (let dir = cwd; ; dir = dirname(dir)) {
		const path = join(dir, "node_modules", name);
		if (existsSync(path)) {
			const real = realpathSync(path);
			// An installed package sits under a `node_modules` of its own.
			return real.includes(`${sep}node_modules${sep}`) ? null : real;
		}
		if (dirname(dir) === dir) return null;
	}
}

// The globs of the files Vitest's `--changed` cannot see in the module graph,
// whose change must rerun every test file: for each workspace package the app
// links, the files under its `src/` that no source export serves. A served
// directory is in the graph; a compiled entry (`dist/`, gitignored) holds none
// of its `src/`. A published app links nothing, so its list is empty.
export function workspaceTriggers(cwd: string): string[] {
	const manifest = JSON.parse(
		readFileSync(join(cwd, "package.json"), "utf8"),
	) as {
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
	};
	const names = Object.keys({
		...manifest.dependencies,
		...manifest.devDependencies,
	});
	return names.flatMap((name) => {
		const root = linked(cwd, name);
		if (root === null || !existsSync(join(root, "src"))) return [];
		const { exports } = JSON.parse(
			readFileSync(join(root, "package.json"), "utf8"),
		) as { exports?: unknown };
		const served = sourceTargets(exports).map((t) => servedDir(root, t));
		return unserved(join(root, "src"), served);
	});
}
