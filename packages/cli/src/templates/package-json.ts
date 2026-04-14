interface PackageJsonOptions {
	name: string;
	db: boolean;
	api: boolean;
	app: boolean;
}

export function packageJsonTemplate(options: PackageJsonOptions): string {
	const deps: Record<string, string> = {};
	const devDeps: Record<string, string> = {
		"@fcalell/cli": "workspace:*",
		"@fcalell/typescript-config": "workspace:*",
		"@fcalell/biome-config": "workspace:*",
	};

	if (options.db) {
		deps["@fcalell/config"] = "workspace:*";
		deps["@fcalell/db"] = "workspace:*";
		devDeps["drizzle-kit"] = "^0.31.0";
		devDeps.tsx = "^4.19.0";
	}

	if (options.api) {
		deps["@fcalell/api"] = "workspace:*";
		devDeps.wrangler = "^4.0.0";
	}

	if (options.app) {
		deps["@fcalell/ui"] = "workspace:*";
		deps["@fcalell/vite"] = "workspace:*";
		deps["solid-js"] = "^1.9.0";
	}

	const pkg: Record<string, unknown> = {
		name: options.name,
		version: "0.0.0",
		private: true,
		type: "module",
	};

	if (options.app) {
		pkg.imports = { "#/*": "./src/*" };
	}

	pkg.scripts = {
		dev: "stack dev",
		deploy: "stack deploy",
		check: "stack check",
	};
	pkg.dependencies = sortKeys(deps);
	pkg.devDependencies = sortKeys(devDeps);

	return `${JSON.stringify(pkg, null, "\t")}\n`;
}

function sortKeys(obj: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)),
	);
}
