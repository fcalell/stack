// Which environments the consumer spans, from its plugin names: the one
// decision behind both the files `stack init` writes and the tsconfig the
// worker's bundler reads (`workerTsconfig`). `node` is the node target
// (`node()` in place of `cloudflare()`): its server runs under Node, with no
// Workers globals, and holds the consumer's services under `src/server`.
export interface TsconfigLayout {
	// A DOM app built by Vite: `vite` in the config.
	web: boolean;
	native: boolean;
	worker: boolean;
	node: boolean;
}

export function tsconfigLayout(plugins: readonly string[]): TsconfigLayout {
	return {
		web: plugins.includes("vite"),
		native: plugins.includes("expo"),
		worker: plugins.includes("api") || plugins.includes("db"),
		node: plugins.includes("node") && !plugins.includes("cloudflare"),
	};
}

function isSplit(layout: TsconfigLayout): boolean {
	return layout.worker && (layout.native || layout.web);
}

// The consumer tsconfig that compiles the worker's sources, the one holding
// the `virtual:stack-procedure` alias: the worker project under the split,
// else the single root config.
export function workerTsconfig(layout: TsconfigLayout): string {
	return isSplit(layout) ? "tsconfig.worker.json" : "tsconfig.json";
}

interface TsconfigOptions extends TsconfigLayout {
	// `compilerOptions.paths` entries plugins contribute via
	// `cliSlots.tsconfigPaths` (e.g. plugin-api's `virtual:stack-procedure` ->
	// `.stack/procedure.ts` alias). Domain-owned data — core only decides
	// *where* it lands (single config vs. the split's worker project), never
	// *what* the mapping contains.
	procedurePaths: Record<string, string[]>;
	// `compilerOptions.types` entries plugins contribute via
	// `cliSlots.tsconfigTypes` (e.g. plugin-native-ui's `uniwind/types` global
	// augmentation). Same domain-agnostic split as `procedurePaths`.
	nativeTypes: string[];
}

// A consumer with both an app and a worker spans two TypeScript environments
// that cannot share one program: the app (DOM, or react-native) and the
// worker (workerd globals from the generated `worker-configuration.d.ts`, or
// Node's on the node target; never the DOM). One program merges both sets of
// globals and they collide: the Workers
// runtime declares HTMLRewriter's `Element` as a global interface, so DOM's
// `Element.append` takes only `string | ReadableStream | Response`. The two
// are split into projects under a solution `tsconfig.json`, so `tsc -b`
// checks both and editors pick the right env per file. Every other consumer
// keeps a single config. Returns `[filename, content]` pairs so init can
// write them all.
//
// The app still needs the worker's types: the typed API client takes the
// router type (`.stack/worker`'s `AppRouter`), whose procedure inputs and
// outputs are inferred from worker sources that only type-check under the
// Workers globals. So the worker project emits declarations into
// `.stack/types/` and the app references it: `tsc -b` builds the worker
// first, and an app import of a worker file resolves to its declaration, so
// no worker source enters the app's program. The declarations carry the
// procedures' plain input and output types, never the request context.
//
// `virtual:stack-procedure` resolves to the generated `.stack/procedure.ts`
// via a tsconfig `paths` alias rather than a bundler virtual-module plugin:
// the worker never runs through Vite. esbuild (`wrangler` dev and deploy
// bundling) resolves tsconfig `paths` natively, the node target maps the
// specifier with a `registerHooks` resolve hook, and `paths` needs no
// `baseUrl` to resolve relative to the tsconfig's own directory (TS 4.1+).
// esbuild otherwise reads the tsconfig nearest each file, under the split the
// solution config with no `paths`, so the CLI names `workerTsconfig` to the
// bundler through `cliSlots.workerTsconfig`.
export function tsconfigTemplate(
	options: TsconfigOptions,
): Array<[string, string]> {
	if (isSplit(options)) {
		const base = options.native ? nativeApp(options.nativeTypes) : webApp();
		return [
			["tsconfig.json", render(SOLUTION)],
			["tsconfig.app.json", render(appProject(base, options.node))],
			["tsconfig.worker.json", render(workerProject(options))],
			["tsconfig.test.json", render(testProject(options.node))],
		];
	}
	if (options.native) {
		return [["tsconfig.json", render(nativeApp(options.nativeTypes))]];
	}

	const single = {
		extends: options.web
			? "@fcalell/typescript-config/web-vite.json"
			: "@fcalell/typescript-config/node-tsx.json",
		compilerOptions: options.worker
			? { paths: options.procedurePaths }
			: undefined,
		// The generated declarations at the `.stack/` root (`Env`, typed
		// routes) are the only generated files the consumer's type-check
		// loads; the rest are bundler inputs that reach `tsc` only through an
		// import (`virtual:stack-procedure`, `worker-configuration.d.ts`'s
		// `import("./worker")`). A bare `.stack` entry matches nothing: `tsc`
		// reads an include whose last segment holds a `.` as a file name, not
		// a directory.
		include: ["src", ".stack/*.d.ts"],
	};
	return [["tsconfig.json", render(single)]];
}

const SOLUTION = {
	files: [],
	references: [
		{ path: "./tsconfig.app.json" },
		{ path: "./tsconfig.worker.json" },
		{ path: "./tsconfig.test.json" },
	],
};

interface Project {
	extends: string;
	compilerOptions: Record<string, unknown>;
	include: string[];
	exclude?: string[];
	references?: Array<{ path: string }>;
}

// Everything but the server's trees (`src/worker`, and on the node target
// `src/server`), which it reads only through the worker project's
// declarations. The app never emits, so its own declaration
// diagnostics are off. Editors follow a project reference to its sources by
// default, which would type those sources under the app's globals; the
// redirect is off so they read the declarations, as `tsc -b` does, current
// as of the last build. `tsc -b` writes the build info even under `noEmit`;
// it lands in `node_modules/.tmp`, ignored already.
function appProject(config: Project, node: boolean): Project {
	return {
		...config,
		compilerOptions: {
			...config.compilerOptions,
			noEmit: true,
			declaration: false,
			declarationMap: false,
			disableSourceOfProjectReferenceRedirect: true,
			tsBuildInfoFile: "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
		},
		exclude: node ? ["src/worker", "src/server"] : ["src/worker"],
		references: [{ path: "./tsconfig.worker.json" }],
	};
}

// The worker's sources, the schema, the isomorphic shared code, the generated
// worker files and the `Env` declarations, with no ambient package types. On
// the node target the server runs under Node: the project loads `@types/node`
// in place of the Workers' generated declarations, which do not exist there,
// and holds the services under `src/server`. A referenced project lists every
// file its program loads, so `src/shared` (which the schema and routes
// import) is its own and the app reads it through its declarations too.
// Every test runs under node and is checked elsewhere: the schema's and the
// shared code's with the app, whose program loads `@types/node`, the
// server's by the test project.
// `declarationMap` lets an editor jump from the app to a procedure's source.
// The build info sits with the declarations, so removing `.stack/` rebuilds
// them rather than leaving `tsc -b` to call a project with no output current.
function workerProject(options: TsconfigOptions): Project {
	return {
		extends: "@fcalell/typescript-config/node-tsx.json",
		compilerOptions: {
			types: options.node ? ["node"] : [],
			paths: options.procedurePaths,
			composite: true,
			// `node-tsx` (via base) disables incremental, which composite
			// forbids.
			incremental: true,
			noEmit: false,
			emitDeclarationOnly: true,
			declarationMap: true,
			outDir: "./.stack/types",
			tsBuildInfoFile: "./.stack/types/tsconfig.worker.tsbuildinfo",
		},
		include: [
			"src/worker",
			"src/schema",
			"src/shared",
			".stack/worker.ts",
			".stack/procedure.ts",
			...(options.node ? ["src/server"] : [".stack/worker-configuration.d.ts"]),
		],
		exclude: ["src/**/*.test.ts"],
	};
}

// The server's tests, which the app excludes with the server's trees and the
// worker project cannot load: they run under node, so the project has Node's
// globals and none of the Workers', and reads the worker's sources (through
// `.stack/testing.ts`) by the worker project's declarations.
function testProject(node: boolean): Project {
	return {
		extends: "@fcalell/typescript-config/node-tsx.json",
		compilerOptions: {
			types: ["node"],
			noEmit: true,
			tsBuildInfoFile: "./node_modules/.tmp/tsconfig.test.tsbuildinfo",
		},
		include: [
			"src/worker/**/*.test.ts",
			...(node ? ["src/server/**/*.test.ts"] : []),
			".stack/testing.ts",
		],
		references: [{ path: "./tsconfig.worker.json" }],
	};
}

function webApp(): Project {
	return {
		extends: "@fcalell/typescript-config/web-vite.json",
		compilerOptions: {},
		include: ["src", ".stack/routes.d.ts"],
	};
}

function nativeApp(types: string[]): Project {
	return {
		extends: "expo/tsconfig.base",
		compilerOptions: {
			noEmit: true,
			strict: true,
			noUncheckedIndexedAccess: true,
			jsxImportSource: "react",
			// Plugin-contributed global type augmentations (e.g. native-ui's
			// uniwind className variants) must load wherever the consumer's
			// `.tsx` is type-checked — some plugins ship source, not
			// declarations, so an ambient package types entry is the only
			// build-independent way to pull the augmentation in. Empty when no
			// plugin contributes one (e.g. `expo()` without `nativeUi()`).
			types,
		},
		include: ["src", ".stack/entry.tsx", ".stack/expo-env.d.ts"],
	};
}

function render(config: unknown): string {
	return `${JSON.stringify(config, null, "\t")}\n`;
}
