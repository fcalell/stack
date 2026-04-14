interface GitignoreOptions {
	db: boolean;
	api: boolean;
	app: boolean;
}

export function gitignoreTemplate(options: GitignoreOptions): string {
	const entries = ["node_modules", "dist"];

	if (options.db) {
		entries.push(".db-kit");
	}
	if (options.api) {
		entries.push(".wrangler");
	}
	if (options.app) {
		entries.push(".vinxi");
	}

	return `${entries.join("\n")}\n`;
}
