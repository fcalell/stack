interface PackageJsonOptions {
	name: string;
	plugins: string[];
}

export function packageJsonTemplate(options: PackageJsonOptions): string {
	const deps: Record<string, string> = {};
	const devDeps: Record<string, string> = {
		"@fcalell/cli": "workspace:*",
		"@fcalell/typescript-config": "workspace:*",
		"@fcalell/biome-config": "workspace:*",
		// biome-config only carries config; the `lint`/`check` scripts need the
		// Biome binary itself on the consumer's PATH.
		"@biomejs/biome": "^2.4.16",
		// The `stack` bin runs via tsx (shebang). tsx is a peerDependency of
		// @fcalell/cli, so the consumer must provide it or the bin can't launch.
		tsx: "^4.19.0",
		typescript: "^5.9.3",
	};

	const hasWorker =
		options.plugins.includes("api") || options.plugins.includes("db");
	if (hasWorker) {
		devDeps.wrangler = "^4.98.0";
	}

	const hasNative = options.plugins.includes("expo");
	if (hasNative) {
		// React's types back the app's JSX (`react/jsx-runtime`) so the native
		// `tsconfig.app.json` resolves the automatic runtime.
		devDeps["@types/react"] = "~19.2.0";
	}

	for (const name of options.plugins) {
		deps[`@fcalell/plugin-${name}`] = "workspace:*";
	}

	const hasSolid =
		options.plugins.includes("solid") || options.plugins.includes("solid-ui");
	if (hasSolid) {
		deps["solid-js"] = "^1.9.0";
	}

	const pkg: Record<string, unknown> = {
		name: options.name,
		version: "0.0.0",
		private: true,
		type: "module",
	};

	if (hasSolid) {
		pkg.imports = { "#/*": "./src/*" };
	}

	const scripts: Record<string, string> = {
		generate: "stack generate",
		dev: "stack dev",
		build: "stack build",
		deploy: "stack deploy",
		// Native consumers run the composite solution via `tsc -b`; everyone
		// else type-checks the single project with `--noEmit`.
		"check-types": hasNative && hasWorker ? "tsc -b" : "tsc --noEmit",
		lint: "biome check --write --unsafe",
		check: "pnpm check-types && pnpm lint",
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
