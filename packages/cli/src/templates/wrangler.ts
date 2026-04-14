interface WranglerOptions {
	name: string;
	databaseId: string;
}

export function wranglerTemplate(options: WranglerOptions): string {
	return `name = "${options.name}"
compatibility_date = "${new Date().toISOString().split("T")[0]}"
main = "src/worker/index.ts"

[[d1_databases]]
binding = "DB_MAIN"
database_name = "${options.name}-db"
database_id = "${options.databaseId}"
`;
}
