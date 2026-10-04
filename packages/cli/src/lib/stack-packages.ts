// Every first-party package a consumer installs, by the directory it lives in
// within stack's repository and the first-party packages its `dependencies`
// name. A test holds each entry to the package's own manifest. `builds` is
// pnpm's verdict on each build script the package brings into the app
// (`true` runs it, `false` skips it); the install that brings the package
// meets them before any plugin loads.
export const STACK_PACKAGES = {
	"@fcalell/cli": {
		dir: "packages/cli",
		dependencies: [],
		// The wrangler its package.json template writes for an app with a worker.
		builds: { esbuild: true, workerd: true },
	},
	"@fcalell/typescript-config": {
		dir: "packages/typescript-config",
		dependencies: [],
	},
	"@fcalell/biome-config": { dir: "packages/biome-config", dependencies: [] },
	"@fcalell/ui-core": { dir: "packages/ui-core", dependencies: [] },
	"@fcalell/plugin-api": { dir: "plugins/api", dependencies: ["@fcalell/cli"] },
	"@fcalell/plugin-auth": {
		dir: "plugins/auth",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-api",
			"@fcalell/plugin-cloudflare",
			"@fcalell/plugin-db",
		],
		// better-auth's Prisma adapter auto-installs its peer; auth uses Drizzle.
		builds: { "@prisma/client": false },
	},
	"@fcalell/plugin-cloudflare": {
		dir: "plugins/cloudflare",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-api",
			"@fcalell/plugin-vite",
		],
	},
	"@fcalell/plugin-db": {
		dir: "plugins/db",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-api",
			"@fcalell/plugin-cloudflare",
		],
		// drizzle-kit's esbuild; better-sqlite3 loads its prebuilt binary on
		// linux, darwin and win32 (x64, arm64), so its source build is skipped.
		builds: { esbuild: true, "better-sqlite3": false },
	},
	"@fcalell/plugin-expo": {
		dir: "plugins/expo",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-api",
			"@fcalell/plugin-cloudflare",
		],
		// Expo's logger reaches bunyan, whose optional DTrace probes compile
		// natively; logging works without them.
		builds: { "dtrace-provider": false },
	},
	"@fcalell/plugin-native-ui": {
		dir: "plugins/native-ui",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-api",
			"@fcalell/plugin-auth",
			"@fcalell/plugin-expo",
			"@fcalell/ui-core",
		],
	},
	"@fcalell/plugin-node": {
		dir: "plugins/node",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-api",
			"@fcalell/plugin-vite",
		],
	},
	"@fcalell/plugin-react": {
		dir: "plugins/react",
		dependencies: ["@fcalell/cli", "@fcalell/plugin-vite"],
	},
	"@fcalell/plugin-react-ui": {
		dir: "plugins/react-ui",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-auth",
			"@fcalell/plugin-react",
			"@fcalell/plugin-vite",
			"@fcalell/ui-core",
		],
	},
	"@fcalell/plugin-vite": {
		dir: "plugins/vite",
		dependencies: ["@fcalell/cli", "@fcalell/plugin-api"],
		// vite's esbuild.
		builds: { esbuild: true },
	},
} as const satisfies Record<
	string,
	{
		dir: string;
		dependencies: readonly string[];
		builds?: Readonly<Record<string, boolean>>;
	}
>;

export type StackPackage = keyof typeof STACK_PACKAGES;

const REPOSITORY = "fcalell/stack";

export function isStackPackage(name: string): name is StackPackage {
	return Object.hasOwn(STACK_PACKAGES, name);
}

// The ref-less subdirectory spec: the consumer's lockfile pins the commit.
export function stackSpec(name: StackPackage): string {
	return `github:${REPOSITORY}#path:/${STACK_PACKAGES[name].dir}`;
}

// The `allowBuilds` key approving a package's `prepare` by repository URL,
// whichever commit the lockfile resolves (pnpm 11.15 or later).
export function stackBuildKey(name: StackPackage): string {
	return `${name}@git+https://github.com/${REPOSITORY}.git`;
}

// The given packages and every first-party package their `dependencies`
// reach, sorted by name.
export function stackClosure(names: Iterable<StackPackage>): StackPackage[] {
	const seen = new Set<StackPackage>();
	const visit = (name: StackPackage): void => {
		if (seen.has(name)) return;
		seen.add(name);
		for (const dep of STACK_PACKAGES[name].dependencies) visit(dep);
	};
	for (const name of names) visit(name);
	return [...seen].sort();
}

// Each first-party plugin's package, by plugin name, with its spec.
export function stackPluginSpecs(
	plugins: Iterable<string>,
): Record<string, string> {
	const specs: Record<string, string> = {};
	for (const name of plugins) {
		const pkgName = `@fcalell/plugin-${name}`;
		if (isStackPackage(pkgName)) specs[pkgName] = stackSpec(pkgName);
	}
	return specs;
}
