import { cliManifest } from "./manifest.ts";

// The package manager a scaffolded project outside stack's workspace pins.
// 11.28.4 is the first whose frozen install does not link a skipped optional
// dependency (fsevents on Linux) or an unresolved optional peer to the working
// directory, a link Vite's watcher then loads as the module (pnpm#16454).
export const PACKAGE_MANAGER = "pnpm@11.28.4";

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
			"@fcalell/plugin-screens",
		],
		// better-auth's Prisma adapter auto-installs its peer; auth uses Drizzle.
		// Its better-sqlite3 ^12 peer installs beside plugin-db's 13 and builds
		// its binding by install script; pnpm may hoist it as drizzle-kit's driver.
		builds: { "@prisma/client": false, "better-sqlite3": true },
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
		// drizzle-kit's esbuild. better-sqlite3 13 ships prebuilt binaries and
		// declares no build (`gypfile: false`).
		builds: { esbuild: true },
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
			"@fcalell/plugin-api",
			"@fcalell/plugin-auth",
			"@fcalell/plugin-react",
			"@fcalell/plugin-screens",
			"@fcalell/plugin-vite",
			"@fcalell/ui-core",
		],
	},
	"@fcalell/plugin-screens": {
		dir: "plugins/screens",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-api",
			"@fcalell/plugin-react",
			"@fcalell/plugin-vite",
			"@fcalell/ui-core",
		],
		// msw reaches the app as its own dependency (`stack add screens`); its
		// postinstall only prints, the worker file is served from its package.
		builds: { msw: false },
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

// The version of an unpublished checkout: no registry holds it, so stack's
// packages come from git.
const UNPUBLISHED = "0.0.0";

// How a consumer outside stack's workspace takes the stack packages: from the
// npm registry at this CLI's own version, or, when the CLI is an unpublished
// checkout (version 0.0.0), from stack's repository on GitHub.
export type StackSpecMode = "npm" | "github";

export function stackSpecMode(
	version: string = cliManifest.version,
): StackSpecMode {
	return version === UNPUBLISHED ? "github" : "npm";
}

export function isStackPackage(name: string): name is StackPackage {
	return Object.hasOwn(STACK_PACKAGES, name);
}

// A stack package's subdirectory spec in stack's repository: at `commit` when
// the consumer pins one in its specs, so every stack package it installs is the
// same commit; ref-less otherwise, the consumer's lockfile pinning the commit.
export function stackGitSpec(
	name: StackPackage,
	commit: string | null = null,
): string {
	const ref = commit === null ? "" : `${commit}&`;
	return `github:${REPOSITORY}#${ref}path:/${STACK_PACKAGES[name].dir}`;
}

// A stack package's spec. On npm every package is published together at one
// version, so the range is `^<the CLI's version>` and `commit` is ignored. An
// unpublished checkout takes the git spec.
export function stackSpec(
	name: StackPackage,
	commit: string | null = null,
	version: string = cliManifest.version,
): string {
	if (stackSpecMode(version) === "npm") return `^${version}`;
	return stackGitSpec(name, commit);
}

// The commit a consumer's stack specs pin (`github:fcalell/stack#<sha>&path:`),
// null when they are ref-less or it has none, and always on npm, which pins
// no commit.
export function pinnedCommit(
	specs: Record<string, string>,
	version: string = cliManifest.version,
): string | null {
	if (stackSpecMode(version) === "npm") return null;
	for (const [name, spec] of Object.entries(specs)) {
		if (!isStackPackage(name)) continue;
		const match = /^github:[^#]+#([0-9a-f]{7,40})&path:/.exec(spec);
		if (match) return match[1] ?? null;
	}
	return null;
}

// The `allowBuilds` key approving a package's `prepare` by repository URL,
// whichever commit the lockfile resolves (pnpm 11.15 or later). Only an install
// from GitHub needs it.
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

// Each first-party plugin's package, by plugin name, with its spec at the
// consumer's pinned commit (on GitHub; npm pins none).
export function stackPluginSpecs(
	plugins: Iterable<string>,
	commit: string | null,
	version: string = cliManifest.version,
): Record<string, string> {
	const specs: Record<string, string> = {};
	for (const name of plugins) {
		const pkgName = `@fcalell/plugin-${name}`;
		if (isStackPackage(pkgName))
			specs[pkgName] = stackSpec(pkgName, commit, version);
	}
	return specs;
}
