import { stackPluginSpecs, stackSpec } from "../lib/stack-packages.ts";
import { tsconfigLayout } from "./tsconfig.ts";

interface PackageJsonOptions {
	name: string;
	plugins: string[];
}

export function packageJsonTemplate(options: PackageJsonOptions): string {
	const deps: Record<string, string> = {};
	const devDeps: Record<string, string> = {
		"@fcalell/cli": stackSpec("@fcalell/cli"),
		"@fcalell/typescript-config": stackSpec("@fcalell/typescript-config"),
		"@fcalell/biome-config": stackSpec("@fcalell/biome-config"),
		// biome-config only carries config; the `lint`/`check` scripts need the
		// Biome binary itself on the consumer's PATH.
		"@biomejs/biome": "^2.4.16",
		typescript: "^5.9.3",
	};

	const hasWorker =
		options.plugins.includes("api") || options.plugins.includes("db");
	const node = tsconfigLayout(options.plugins).node;
	if (hasWorker || node) {
		// The server's tests run under Node on either target, and on the node
		// target its server does too, with no wrangler.
		devDeps["@types/node"] = "^25.5.0";
	}
	if (hasWorker && !node) devDeps.wrangler = "^4.98.0";

	const hasNative = options.plugins.includes("expo");
	const hasReactDom = options.plugins.includes("react");
	if (hasNative || hasReactDom) {
		// React's types back the app's JSX (`react/jsx-runtime`) so the app's
		// tsconfig resolves the automatic runtime. The native app's React is
		// the one Expo pins.
		devDeps["@types/react"] = hasNative ? "~19.2.0" : "^19.3.0";
	}
	if (hasReactDom) {
		deps.react = "^19.3.0";
		deps["react-dom"] = "^19.3.0";
		devDeps["@types/react-dom"] = "^19.3.0";
	}

	Object.assign(deps, stackPluginSpecs(options.plugins));

	const hasWeb = tsconfigLayout(options.plugins).web;

	const pkg: Record<string, unknown> = {
		name: options.name,
		version: "0.0.0",
		private: true,
		type: "module",
		packageManager: "pnpm@11.28.3",
	};

	// TODO: `#/*` once the scaffold's TypeScript is 6.0 or later; 5.9
	// refuses a subpath import that starts with `#/`.
	if (hasWeb) {
		pkg.imports = { "#src/*": "./src/*" };
	}

	const scripts: Record<string, string> = {
		generate: "stack generate",
		dev: "stack dev",
		build: "stack build",
		deploy: "stack deploy",
		// An app with a worker is a solution of two projects, which only
		// `tsc -b` checks: `--noEmit` on its `files: []` root checks nothing.
		"check-types":
			(hasNative || hasWeb) && hasWorker ? "tsc -b" : "tsc --noEmit",
		// Node finds no file in a fresh app and passes.
		test: "node --test 'src/**/*.test.ts'",
		lint: "biome check --write --unsafe",
		check: "pnpm check-types && pnpm test && pnpm lint",
	};

	pkg.scripts = scripts;
	pkg.dependencies = sortKeys(deps);
	pkg.devDependencies = sortKeys(devDeps);

	return `${JSON.stringify(pkg, null, "\t")}\n`;
}

function sortKeys(obj: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)),
	);
}
