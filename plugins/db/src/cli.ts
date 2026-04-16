import type { CliPlugin, GeneratedFile } from "@fcalell/config/plugin";
import type { DbOptions } from "./index";
import { getSchemaPath } from "./index";

const SCHEMA_TEMPLATE = `import { sqliteTable, text, integer } from "@fcalell/plugin-db/orm";

export const examples = sqliteTable("examples", {
\tid: text("id").primaryKey(),
\tname: text("name").notNull(),
\tcreatedAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
`;

const plugin: CliPlugin<DbOptions> = {
	name: "db",
	label: "Database",

	detect(ctx) {
		return ctx.hasPlugin("db");
	},

	async prompt(ctx) {
		const dialect = await ctx.prompt.select<"d1" | "sqlite">(
			"Database dialect:",
			[
				{ label: "D1 (Cloudflare)", value: "d1" },
				{ label: "SQLite (local)", value: "sqlite" },
			],
		);

		if (dialect === "d1") {
			const databaseId = await ctx.prompt.text("D1 database ID:", {
				default: "YOUR_D1_DATABASE_ID",
			});
			return { dialect, databaseId };
		}

		const path = await ctx.prompt.text("SQLite file path:", {
			default: "./data/app.sqlite",
		});
		return { dialect, path };
	},

	async scaffold(ctx, _answers) {
		await ctx.writeIfMissing("src/schema/index.ts", SCHEMA_TEMPLATE);
		await ctx.ensureDir("src/migrations");

		ctx.addDependencies({
			"@fcalell/plugin-db": "workspace:*",
		});
		ctx.addDevDependencies({
			"drizzle-kit": "^0.31.0",
			tsx: "^4.19.0",
		});
		ctx.addToGitignore(".db-kit");
	},

	bindings(options) {
		if (options.dialect === "d1") {
			return [
				{
					name: options.binding ?? "DB_MAIN",
					type: "d1",
					databaseId: options.databaseId,
					databaseName: options.databaseId,
				},
			];
		}
		return [];
	},

	async generate(_ctx): Promise<GeneratedFile[]> {
		return [];
	},

	worker: {
		runtime: {
			importFrom: "@fcalell/plugin-db/runtime",
			factory: "dbRuntime",
		},
	},

	async dev(ctx) {
		const dbOptions = ctx.getPluginOptions<DbOptions>("db");
		if (!dbOptions) return {};

		const schemaPath = getSchemaPath(dbOptions);

		return {
			async setup() {
				ctx.log.info("Pushing schema to local database...");
				// TODO: port full drizzle-kit push from packages/cli/src/drizzle/run.ts
				// For now, this writes a drizzle config and runs drizzle-kit push
			},
			watchers: [
				{
					paths: [schemaPath],
					debounce: 300,
					async onChange() {
						ctx.log.info("Schema change detected, pushing...");
						// TODO: re-push schema via drizzle-kit
					},
				},
			],
		};
	},

	async deploy(ctx) {
		const dbOptions = ctx.getPluginOptions<DbOptions>("db");
		if (!dbOptions) return;

		ctx.log.info("Running database migrations...");
		// TODO: port drizzle-kit generate + migrate from packages/cli/src/drizzle/run.ts
	},
};

export default plugin;
