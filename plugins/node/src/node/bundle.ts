import { createHash } from "node:crypto";
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
import { basename, dirname, join, relative, resolve } from "node:path";
import type { Plugin } from "esbuild";
import { isListedModule } from "../listed.ts";
import type { BundleEntry } from "../types.ts";

// What the production bundle is: the server, the app's sources and every
// dependency written into ONE file (`server.mjs`) by esbuild, plus the few things
// a file cannot hold: a package with a native addon (it keeps its binary, so it is
// copied with its own dependencies under `node_modules/` beside the bundle, where
// Node finds it) and the files an entry asks to be copied (db's migrations). The
// directory then runs on a box with only `node` on it, wherever the app was built
// (a `link:` to a checkout, a workspace package, TypeScript under `node_modules`
// are all followed at build). Every module of `src/bin/` is a second kind of entry,
// bundled the same way to `bin/<name>.mjs`: a tool run by hand on that box.

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
	// The tools bundled from `src/bin/`, by name.
	bins: string[];
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

// A worker thread is started from a module the bundle holds no file for, and a
// directory listed at run time lists the source's files, not the bundle's. Two
// idioms the build reads in the app's own sources (never a dependency's) and
// rewrites, so neither needs a registry or a second build step:
//   new Worker(new URL("./w.ts", import.meta.url))  the module is bundled on its own
//       to `workers/<name>.mjs` beside the server, and the URL names that file;
//   loadModules(new URL("./jobs/", import.meta.url))  (`@fcalell/plugin-node/server`)
//       the directory's modules are listed at build and imported, lazily, by the
//       bundle; from source the same call reads the directory.
const WORKER =
	/(new\s+Worker\(\s*(?:fileURLToPath\(\s*)?)new\s+URL\(\s*(["'])(\.{1,2}\/[^"']+)\2\s*,\s*import\.meta\.url\s*\)/g;
const LOAD_MODULES =
	/\bloadModules\(\s*new\s+URL\(\s*(["'])(\.{1,2}\/[^"']*)\1\s*,\s*import\.meta\.url\s*\)\s*\)/g;
const LOADER: Record<string, "ts" | "tsx" | "js"> = {
	".ts": "ts",
	".mts": "ts",
	".tsx": "tsx",
	".js": "js",
	".mjs": "js",
};

function listedModules(directory: string): string[] {
	return existsSync(directory)
		? readdirSync(directory).filter(isListedModule).sort()
		: [];
}

/** The source with its worker URLs and `loadModules` calls rewritten for the bundle. `worker` maps a worker module's path to the URL the rewritten source names. */
export function rewriteSource(
	source: string,
	file: string,
	worker: (path: string) => string,
): string {
	const dir = dirname(file);
	return source
		.replace(WORKER, (_whole, head, _quote, specifier: string) => {
			return `${head}new URL(${JSON.stringify(worker(resolve(dir, specifier)))}, import.meta.url)`;
		})
		.replace(LOAD_MODULES, (_whole, _quote, specifier: string) => {
			const directory = resolve(dir, specifier);
			const loaders = listedModules(directory).map(
				(name) =>
					`${JSON.stringify(name.replace(/\.m?ts$/, ""))}: () => import(${JSON.stringify(join(directory, name))})`,
			);
			return `(async (all) => Object.fromEntries(await Promise.all(Object.entries(all).map(async ([name, load]) => [name, await load()]))))({ ${loaders.join(", ")} })`;
		});
}

export async function bundleServer(options: BundleOptions): Promise<Bundled> {
	const { cwd, entry, outDir } = options;
	rmSync(outDir, { recursive: true, force: true });
	mkdirSync(outDir, { recursive: true });

	// Packages kept as files, found while esbuild resolves.
	const natives = new Map<string, string>();
	const checked = new Map<string, boolean>();
	const procedure = join(cwd, ".stack", "procedure.ts");

	// The worker modules the sources start, to bundle beside the server.
	const workers = new Map<string, string>();
	const workerName = (path: string) => {
		let name = workers.get(path);
		if (!name) {
			const hash = createHash("sha1").update(path).digest("hex").slice(0, 8);
			name = `${basename(path).replace(/\.[^.]+$/, "")}-${hash}`;
			workers.set(path, name);
		}
		return name;
	};

	// `prefix` is the directory of `workers/`, as a URL from the module being built.
	const pluginFor = (prefix: string): Plugin => ({
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
			b.onLoad({ filter: /\.(m?ts|tsx|m?js)$/ }, (args) => {
				if (/[\\/]node_modules[\\/]/.test(args.path)) return undefined;
				const source = readFileSync(args.path, "utf8");
				if (!source.includes("new Worker") && !source.includes("loadModules("))
					return undefined;
				const contents = rewriteSource(
					source,
					args.path,
					(path) => `${prefix}${workerName(path)}.mjs`,
				);
				const extension = /\.[^.]+$/.exec(args.path)?.[0] ?? ".ts";
				return {
					contents,
					loader: LOADER[extension] ?? "ts",
					resolveDir: dirname(args.path),
				};
			});
		},
	});

	// Loaded here: esbuild is the plugin's optional peer, which the app declares
	// as a devDependency (`stack init` and `stack add node` write it), so a config
	// that only reads this plugin, and an install that only runs the app, never
	// pay for it.
	let build: typeof import("esbuild").build;
	try {
		({ build } = await import("esbuild"));
	} catch (cause) {
		throw new Error(
			"esbuild is not installed: `stack build` bundles the Node server with it. Add it to the app's devDependencies (`pnpm add -D esbuild`).",
			{ cause },
		);
	}
	const bundle = (entryPoint: string, outfile: string, prefix: string) =>
		build({
			entryPoints: [entryPoint],
			outfile,
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
			plugins: [pluginFor(prefix)],
		});

	const file = join(outDir, "server.mjs");
	await bundle(entry, file, "./workers/");
	// The tools: each module of `src/bin/` beside the server, in `bin/`, so the
	// workers are one directory up.
	const bins = listedModules(join(cwd, "src", "bin"));
	for (const name of bins) {
		await bundle(
			join(cwd, "src", "bin", name),
			join(outDir, "bin", name.replace(/\.m?ts$/, ".mjs")),
			"../workers/",
		);
	}
	// A worker may start workers of its own: build until none is new.
	const built = new Set<string>();
	for (;;) {
		const next = [...workers.entries()].find(([path]) => !built.has(path));
		if (!next) break;
		built.add(next[0]);
		await bundle(next[0], join(outDir, "workers", `${next[1]}.mjs`), "./");
	}

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
	return {
		file,
		bins: bins.map((name) => name.replace(/\.m?ts$/, ".mjs")),
		native,
	};
}
