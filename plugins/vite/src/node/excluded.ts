import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, join, resolve } from "node:path";
import type { Plugin } from "vite";

// The dev optimizer's scan stops at a package in `optimizeDeps.exclude`, so
// what that package imports is found when a page first loads it, bundled then,
// and the page reloads (a screens run fails on "Vite unexpectedly reloaded a
// test"). This reads the packages instead: from each one's raw source exports
// (`./src/*.ts(x)`, the reason it is served raw), through the files they
// import, to the bare specifiers they reach, so the list cannot go stale.

const SOURCE = /^\.\/src\/.+\.(?:[cm]?[jt]sx?)$/;
const SUFFIXES = ["", ".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.js"];
const BUILTINS = new Set(builtinModules);

// The first directory up from `from` that holds `node_modules/<name>`.
function findPackage(name: string, from: string): string | undefined {
	for (let dir = resolve(from); ; dir = dirname(dir)) {
		const found = join(dir, "node_modules", name);
		if (existsSync(join(found, "package.json"))) return realpathSync(found);
		if (dirname(dir) === dir) return undefined;
	}
}

interface Manifest {
	exports?: Record<string, unknown>;
}

// A subpath's file: a string target, or the `default`/`import` of a condition map.
function targetOf(value: unknown): string | undefined {
	if (typeof value === "string") return value;
	if (value && typeof value === "object") {
		const map = value as Record<string, unknown>;
		return targetOf(map.default ?? map.import);
	}
	return undefined;
}

// The file a relative specifier names: as written, with a suffix, or a `.js`
// spelling of a TypeScript source.
function localFile(from: string, specifier: string): string | undefined {
	const base = resolve(dirname(from), specifier);
	const stem = base.replace(/\.[cm]?js$/, "");
	return [base, stem]
		.flatMap((path) => SUFFIXES.map((suffix) => path + suffix))
		.find((path) => {
			try {
				return statSync(path).isFile();
			} catch {
				return false;
			}
		});
}

function read(file: string): string {
	try {
		return readFileSync(file, "utf8");
	} catch {
		return "";
	}
}

const COMMENTS = /\/\*[\s\S]*?\*\/|(?<![:"'`\\])\/\/.*$/gm;
const IMPORTS =
	/(?:\b(?:import|export)(?!\s+type\b)[^'"`;]*?\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;

// The module specifiers a file writes: static and dynamic imports, re-exports.
export function importsOf(source: string): string[] {
	return [...source.replace(COMMENTS, "").matchAll(IMPORTS)].flatMap((match) =>
		match[1] ? [match[1]] : [],
	);
}

function packageOf(specifier: string): string {
	const parts = specifier.split("/");
	return specifier.startsWith("@")
		? parts.slice(0, 2).join("/")
		: (parts[0] ?? "");
}

// What the raw source of each excluded entry imports from outside it, for
// `optimizeDeps.include`. An entry is a package (all its raw source exports
// `./src/*`) or one of its subpaths (that export alone). A file's own package
// is followed into where the entry is the whole package, and otherwise named
// as it is (the optimizer bundles that subpath and what it imports); any other
// package is `entry package > specifier`. A package that is not installed, an
// import that does not resolve from the importer (an optional peer that is
// absent) and the names in `skip` (the app's singletons, which its own scan
// finds) are left out.
export function excludedImports(
	excluded: readonly string[],
	root: string,
	skip: ReadonlySet<string> = new Set(),
): string[] {
	const found = new Set<string>();
	for (const entry of excluded) {
		const name = packageOf(entry);
		const dir = findPackage(name, root);
		if (!dir) continue;
		const manifest = JSON.parse(
			read(join(dir, "package.json")) || "{}",
		) as Manifest;
		const subpaths = manifest.exports ?? {};
		const whole = entry === name;
		const isExcluded = (specifier: string): boolean =>
			excluded.some((e) => specifier === e || specifier.startsWith(`${e}/`));
		const files = new Set<string>();
		const visit = (file: string): void => {
			if (files.has(file)) return;
			files.add(file);
			for (const specifier of importsOf(read(file))) {
				if (specifier.startsWith(".")) {
					const own = localFile(file, specifier);
					if (own) visit(own);
					continue;
				}
				if (specifier.startsWith("node:") || BUILTINS.has(specifier)) continue;
				if (specifier.startsWith("virtual:")) continue;
				const owner = packageOf(specifier);
				if (owner === name) {
					if (whole) {
						const target = targetOf(
							subpaths[`.${specifier.slice(name.length)}`],
						);
						if (target) visit(join(dir, target));
					} else if (!isExcluded(specifier)) found.add(specifier);
					continue;
				}
				if (isExcluded(specifier) || skip.has(owner)) continue;
				if (findPackage(owner, dir)) found.add(`${name} > ${specifier}`);
			}
		};
		const seeds = whole
			? Object.values(subpaths)
					.map(targetOf)
					.filter((target) => target && SOURCE.test(target))
			: [targetOf(subpaths[`.${entry.slice(name.length)}`])];
		for (const target of seeds) if (target) visit(join(dir, target));
	}
	return [...found].sort();
}

// Adds `excludedImports` of the config's `optimizeDeps.exclude` to
// `optimizeDeps.include`, so the optimizer bundles them at start.
export function excludedImportsPlugin(): Plugin {
	return {
		name: "fcalell:excluded-imports",
		config: (config) => {
			const exclude = config.optimizeDeps?.exclude ?? [];
			if (exclude.length === 0) return undefined;
			const include = excludedImports(
				exclude,
				config.root ?? process.cwd(),
				new Set(config.resolve?.dedupe ?? []),
			);
			return include.length > 0 ? { optimizeDeps: { include } } : undefined;
		},
	};
}
