import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	statSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import type { Plugin } from "esbuild";
import type { BundleEntry } from "../types.ts";

// What the production bundle is: the server, the app's sources and every
// dependency written into ONE file (`server.mjs`) by esbuild, plus the few things
// a file cannot hold: a package with a native addon (it keeps its binary, so it is
// copied with its own dependencies under `node_modules/` beside the bundle, where
// Node finds it) and the files an entry asks to be copied (db's migrations). The
// directory then runs on a box with only `node` on it, wherever the app was built
// (a `link:` to a checkout, a workspace package, TypeScript under `node_modules`
// are all followed at build).

export interface BundleOptions {
	cwd: string;
	// The generated entry (`.stack/server.bundle.ts`).
	entry: string;
	// The bundle's directory (`dist/server`); emptied first.
	outDir: string;
	entries: readonly BundleEntry[];
}

export interface Bundled {
	file: string;
	// The packages kept as files, with their versions.
	native: Record<string, string>;
}

const PACKAGE_NAME = /^(@[^/]+\/[^/]+|[^@./][^/]*)/;

// Where a package sits above a directory, as the node resolution walks.
function findPackage(name: string, from: string): string | undefined {
	for (let dir = from; ; dir = dirname(dir)) {
		const found = join(dir, "node_modules", name);
		if (existsSync(join(found, "package.json"))) return realpathSync(found);
		if (dirname(dir) === dir) return undefined;
	}
}

// A package whose compiled addon cannot live inside a JavaScript file: it ships
// a binding file or prebuilt binaries.
function isNative(dir: string): boolean {
	return (
		existsSync(join(dir, "binding.gyp")) ||
		existsSync(join(dir, "prebuilds")) ||
		existsSync(join(dir, "build", "Release"))
	);
}

const readJson = (file: string) =>
	JSON.parse(readFileSync(file, "utf8")) as {
		version?: string;
		dependencies?: Record<string, string>;
		optionalDependencies?: Record<string, string>;
	};

// A native package's own sources and docs are build-time weight (better-sqlite3
// carries its 10 MB SQLite amalgamation in `deps/`), its binary and loader are not.
const WEIGHT = new Set([
	"deps",
	"docs",
	"doc",
	"test",
	"tests",
	"benchmark",
	".github",
]);

function copyPackage(from: string, to: string): void {
	cpSync(from, to, {
		recursive: true,
		filter: (path) => {
			const inside = relative(from, path).split(/[\\/]/);
			const top = inside[0] ?? "";
			if (inside.length === 1 && top !== "") {
				if (WEIGHT.has(top)) return false;
				// `src` of an addon is C++; a package's JavaScript `src` stays.
				if (top === "src" && statSync(path).isDirectory()) {
					return !readdirSync(path).some((file) =>
						/\.(c|cc|cpp|h|hpp)$/.test(file),
					);
				}
			}
			return top !== "node_modules";
		},
	});
}

// Copies a native package and the packages it needs to run beside the bundle.
function keepNative(
	name: string,
	dir: string,
	outDir: string,
	kept: Record<string, string>,
): void {
	if (name in kept) return;
	const manifest = readJson(join(dir, "package.json"));
	kept[name] = manifest.version ?? "";
	copyPackage(dir, join(outDir, "node_modules", name));
	for (const needed of Object.keys({
		...manifest.dependencies,
		...manifest.optionalDependencies,
	})) {
		const found = findPackage(needed, dir);
		if (found) keepNative(needed, found, outDir, kept);
	}
}

export async function bundleServer(options: BundleOptions): Promise<Bundled> {
	const { cwd, entry, outDir } = options;
	rmSync(outDir, { recursive: true, force: true });
	mkdirSync(outDir, { recursive: true });

	// Packages kept as files, found while esbuild resolves.
	const natives = new Map<string, string>();
	const checked = new Map<string, boolean>();
	const procedure = join(cwd, ".stack", "procedure.ts");

	const plugin: Plugin = {
		name: "stack-node-bundle",
		setup(b) {
			// The route files' `virtual:stack-procedure` is `.stack/procedure.ts`
			// (what the source entry registers a resolve hook for).
			b.onResolve({ filter: /^virtual:stack-procedure$/ }, () => ({
				path: procedure,
			}));
			b.onResolve({ filter: /^[^./#]/ }, (args) => {
				if (args.kind === "entry-point" || /^(node:|virtual:)/.test(args.path))
					return undefined;
				const name = PACKAGE_NAME.exec(args.path)?.[1];
				if (!name) return undefined;
				if (!checked.has(name)) {
					const dir = findPackage(name, args.resolveDir);
					const native = dir !== undefined && isNative(dir);
					checked.set(name, native);
					if (native && dir) natives.set(name, dir);
				}
				return checked.get(name)
					? { path: args.path, external: true }
					: undefined;
			});
		},
	};

	const file = join(outDir, "server.mjs");
	// Loaded here: a config that only reads this plugin never pays for esbuild.
	const { build } = await import("esbuild");
	await build({
		entryPoints: [entry],
		outfile: file,
		bundle: true,
		platform: "node",
		format: "esm",
		target: "node24",
		sourcemap: "linked",
		legalComments: "none",
		logLevel: "warning",
		absWorkingDir: cwd,
		// CommonJS packages inside an ES module bundle still `require` and read
		// `__dirname`.
		banner: {
			js: [
				'import { createRequire as __stackRequire } from "node:module";',
				'import { fileURLToPath as __stackFile } from "node:url";',
				'import { dirname as __stackDir } from "node:path";',
				"const require = __stackRequire(import.meta.url);",
				"const __filename = __stackFile(import.meta.url);",
				"const __dirname = __stackDir(__filename);",
			].join("\n"),
		},
		plugins: [plugin],
	});

	const native: Record<string, string> = {};
	for (const [name, dir] of natives) keepNative(name, dir, outDir, native);

	for (const entryFiles of options.entries) {
		for (const copy of entryFiles.copy ?? []) {
			const from = join(cwd, copy.from);
			const to = join(outDir, copy.to);
			if (!existsSync(from)) continue;
			cpSync(from, to, {
				recursive: true,
				filter: (path) =>
					!copy.only ||
					statSync(path).isDirectory() ||
					copy.only(relative(from, path).split("\\").join("/")),
			});
		}
	}
	return { file, native };
}
