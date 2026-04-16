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

	return `${entries.join("\n")}\n`;
}
