interface GitignoreOptions {
	plugins: string[];
}

export function gitignoreTemplate(options: GitignoreOptions): string {
	const entries = [
		"node_modules",
		"dist",
		".stack",
		".direnv",
		".corepack",
		".dev.vars",
	];

	if (options.plugins.includes("db")) {
		entries.push(".db-kit");
	}
	if (options.plugins.includes("api")) {
		entries.push(".wrangler");
	}

	return `${entries.join("\n")}\n`;
}
