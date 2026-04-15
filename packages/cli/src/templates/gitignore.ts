interface GitignoreOptions {
	db: boolean;
	api: boolean;
	app: boolean;
}

export function gitignoreTemplate(options: GitignoreOptions): string {
	const entries = ["node_modules", "dist", ".stack"];

	if (options.db) {
		entries.push(".db-kit");
	}
	if (options.api) {
		entries.push(".wrangler");
	}

	return `${entries.join("\n")}\n`;
}
