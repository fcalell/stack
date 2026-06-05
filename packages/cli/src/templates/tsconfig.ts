interface TsconfigOptions {
	solid: boolean;
	native: boolean;
	worker: boolean;
}

// Native consumers span two TypeScript environments that cannot share one
// config: the Expo app (JSX, react-native lib, bundler resolution) and the
// Cloudflare worker (workerd globals from the generated
// `worker-configuration.d.ts`, no DOM). They are split into two composite
// projects under a solution `tsconfig.json` so `tsc -b` checks both and
// editors pick the right env per file. Non-native consumers keep a single
// config. Returns `[filename, content]` pairs so init can write them all.
export function tsconfigTemplate(
	options: TsconfigOptions,
): Array<[string, string]> {
	if (options.native) {
		return options.worker ? nativeSplit() : nativeAppOnly();
	}

	const single = {
		extends: options.solid
			? "@fcalell/typescript-config/solid-vite.json"
			: "@fcalell/typescript-config/node-tsx.json",
		include: ["src", ".stack"],
	};
	return [["tsconfig.json", render(single)]];
}

function nativeSplit(): Array<[string, string]> {
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
		},
		include: [
			"src/worker",
			"src/schema",
			".stack/worker.ts",
			".stack/worker-configuration.d.ts",
		],
	};
	return [
		["tsconfig.json", render(solution)],
		["tsconfig.app.json", render(appProject(true))],
		["tsconfig.worker.json", render(worker)],
	];
}

function nativeAppOnly(): Array<[string, string]> {
	return [["tsconfig.json", render(appProject(false))]];
}

function appProject(composite: boolean): Record<string, unknown> {
	return {
		extends: "expo/tsconfig.base",
		compilerOptions: {
			...(composite ? { composite: true } : {}),
			noEmit: true,
			strict: true,
			noUncheckedIndexedAccess: true,
			jsxImportSource: "react",
			types: [],
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
