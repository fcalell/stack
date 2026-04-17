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
		typescript: "^5.9.3",
	};

	const hasWorker =
		options.plugins.includes("api") || options.plugins.includes("db");
	if (hasWorker) {
		devDeps.wrangler = "^4.14.0";
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
