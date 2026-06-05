interface GitignoreOptions {
	plugins: string[];
}

export function gitignoreTemplate(options: GitignoreOptions): string {
	const entries = ["node_modules", "dist", ".stack"];

	if (options.plugins.includes("db")) {
		entries.push(".db-kit");
	}
	if (options.plugins.includes("api")) {
		entries.push(".wrangler");
		entries.push(".dev.vars");
	}
	// Native consumers type-check via the composite `tsc -b`, which writes
	// incremental build-info files next to the configs.
	const hasNativeWorker =
		options.plugins.includes("expo") &&
		(options.plugins.includes("api") || options.plugins.includes("db"));
	if (hasNativeWorker) {
		entries.push("*.tsbuildinfo");
	}

	return `${entries.join("\n")}\n`;
}
