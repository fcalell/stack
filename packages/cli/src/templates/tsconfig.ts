interface TsconfigOptions {
	solid: boolean;
	native: boolean;
	worker: boolean;
	// `compilerOptions.paths` entries plugins contribute via
	// `cliSlots.tsconfigPaths` (e.g. plugin-api's `virtual:stack-procedure` ->
	// `.stack/procedure.ts` alias). Domain-owned data — core only decides
	// *where* it lands (single config vs. the native split's worker project),
	// never *what* the mapping contains.
	procedurePaths: Record<string, string[]>;
	// `compilerOptions.types` entries plugins contribute via
	// `cliSlots.tsconfigTypes` (e.g. plugin-native-ui's `uniwind/types` global
	// augmentation). Same domain-agnostic split as `procedurePaths`.
	nativeTypes: string[];
}

// Native consumers span two TypeScript environments that cannot share one
// config: the Expo app (JSX, react-native lib, bundler resolution) and the
// Cloudflare worker (workerd globals from the generated
// `worker-configuration.d.ts`, no DOM). They are split into two composite
// projects under a solution `tsconfig.json` so `tsc -b` checks both and
// editors pick the right env per file. Non-native consumers keep a single
// config. Returns `[filename, content]` pairs so init can write them all.
//
// `virtual:stack-procedure` resolves to the generated `.stack/procedure.ts`
// via a tsconfig `paths` alias rather than a bundler virtual-module plugin:
// the worker never runs through Vite, but both loaders that touch it (tsx for
// `stack dev`'s subprocess boot, esbuild for `wrangler`/deploy bundling)
// resolve tsconfig `paths` natively, and `paths` needs no `baseUrl` to
// resolve relative to the tsconfig's own directory (TS 4.1+).
export function tsconfigTemplate(
	options: TsconfigOptions,
): Array<[string, string]> {
	if (options.native) {
		return options.worker ? nativeSplit(options) : nativeAppOnly(options);
	}

	const single = {
		extends: options.solid
			? "@fcalell/typescript-config/solid-vite.json"
			: "@fcalell/typescript-config/node-tsx.json",
		compilerOptions: options.worker
			? { paths: options.procedurePaths }
			: undefined,
		include: ["src", ".stack"],
	};
	return [["tsconfig.json", render(single)]];
}

function nativeSplit(options: TsconfigOptions): Array<[string, string]> {
	const solution = {
		files: [],
		references: [
			{ path: "./tsconfig.app.json" },
			{ path: "./tsconfig.worker.json" },
		],
	};
	const worker = {
		extends: "@fcalell/typescript-config/node-tsx.json",
		compilerOptions: {
			composite: true,
			// `node-tsx` (via base) disables incremental, which composite
			// forbids; the explicit build-info path keeps it out of the shared
			// typescript-config package's `dist`.
			incremental: true,
			noEmit: true,
			tsBuildInfoFile: "./tsconfig.worker.tsbuildinfo",
			types: [],
			paths: options.procedurePaths,
		},
		include: [
			"src/worker",
			"src/schema",
			".stack/worker.ts",
			".stack/procedure.ts",
			".stack/worker-configuration.d.ts",
		],
	};
	return [
		["tsconfig.json", render(solution)],
		["tsconfig.app.json", render(appProject(true, options.nativeTypes))],
		["tsconfig.worker.json", render(worker)],
	];
}

function nativeAppOnly(options: TsconfigOptions): Array<[string, string]> {
	return [["tsconfig.json", render(appProject(false, options.nativeTypes))]];
}

function appProject(
	composite: boolean,
	types: string[],
): Record<string, unknown> {
	return {
		extends: "expo/tsconfig.base",
		compilerOptions: {
			...(composite ? { composite: true } : {}),
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
		include: composite
			? [
					"src/app",
					"src/ui",
					"src/lib",
					".stack/entry.tsx",
					".stack/routes.d.ts",
					".stack/expo-env.d.ts",
				]
			: [
					"src",
					".stack/entry.tsx",
					".stack/routes.d.ts",
					".stack/expo-env.d.ts",
				],
	};
}

function render(config: unknown): string {
	return `${JSON.stringify(config, null, "\t")}\n`;
}
