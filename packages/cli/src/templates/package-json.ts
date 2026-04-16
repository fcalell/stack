interface PackageJsonOptions {
	name: string;
	plugins: string[];
}

export function packageJsonTemplate(options: PackageJsonOptions): string {
	const deps: Record<string, string> = {};
	const devDeps: Record<string, string> = {
		"@fcalell/cli": "workspace:*",
		"@fcalell/config": "workspace:*",
		"@fcalell/typescript-config": "workspace:*",
		"@fcalell/biome-config": "workspace:*",
	};

	for (const name of options.plugins) {
		deps[`@fcalell/plugin-${name}`] = "workspace:*";
	}

	const hasApp = options.plugins.includes("app");
	if (hasApp) {
		deps["solid-js"] = "^1.9.0";
	}

	const pkg: Record<string, unknown> = {
		name: options.name,
		version: "0.0.0",
		private: true,
		type: "module",
	};

	if (hasApp) {
		pkg.imports = { "#/*": "./src/*" };
	}

	const scripts: Record<string, string> = {
		generate: "stack generate",
		dev: "stack dev",
		build: "stack build",
		deploy: "stack deploy",
	};

	if (hasApp) {
		scripts["dev:app"] = "stack-vite dev";
		scripts.preview = "stack-vite preview";
	}

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
