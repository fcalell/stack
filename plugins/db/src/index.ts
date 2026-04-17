import { join } from "node:path";
import { createPlugin, fromSchema } from "@fcalell/cli";
import {
	Codegen,
	Deploy,
	Dev,
	Generate,
	Init,
	Remove,
} from "@fcalell/cli/events";
import {
	applyMigrationsLocal,
	applyMigrationsRemote,
	generateMigrations,
	pushSchemaLocal,
} from "./node/push";
import { type DbOptions, dbOptionsSchema } from "./types";

function serialize(value: unknown): string {
	return JSON.stringify(value, null, "\t");
}

const SCHEMA_TEMPLATE = `import { sqliteTable, text, integer } from "@fcalell/plugin-db/orm";

export const examples = sqliteTable("examples", {
\tid: text("id").primaryKey(),
\tname: text("name").notNull(),
\tcreatedAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
`;

export const db = createPlugin("db", {
	label: "Database",
	events: ["SchemaReady"],

	config: fromSchema<DbOptions>(dbOptionsSchema),

	commands: {
		push: {
			description: "Push schema to local database",
			handler: async (ctx) => {
				ctx.log.info("Pushing schema...");
				await pushSchemaLocal(ctx.cwd, ctx.options);
				ctx.log.success("Schema pushed");
			},
		},
		generate: {
			description: "Generate migration files from schema diff",
			handler: async (ctx) => {
				const migrations = await generateMigrations(ctx.cwd, ctx.options);
				if (migrations.length === 0) {
					ctx.log.info("No schema changes detected");
					return;
				}
				for (const m of migrations) {
					ctx.log.info(`Created ${m.name}`);
				}
				ctx.log.success(`Generated ${migrations.length} migration(s)`);
			},
		},
		apply: {
			description: "Apply pending migrations",
			options: {
				remote: {
					type: "boolean" as const,
					description: "Apply to remote D1",
					default: false,
				},
			},
			handler: async (ctx, flags) => {
				if (flags.remote) {
					await applyMigrationsRemote(ctx.cwd, ctx.options);
				} else {
					await applyMigrationsLocal(ctx.cwd, ctx.options);
				}
				ctx.log.success("Migrations applied");
			},
		},
		reset: {
			description: "Reset local database (all data will be lost)",
			handler: async (ctx) => {
				if (process.stdin.isTTY) {
					const ok = await ctx.prompt.confirm(
						"Reset local database? All data will be lost.",
					);
					if (!ok) return;
				}
				const { rmSync } = await import("node:fs");
				rmSync(join(ctx.cwd, ".stack/dev"), {
					recursive: true,
					force: true,
				});
				ctx.log.success("Local database deleted. Run `stack dev` to recreate.");
			},
		},
	},

	register(ctx, bus, events) {
		let currentPush: Promise<void> | null = null;
		let queuedPush: Promise<void> | null = null;
		const serializedPush = (): Promise<void> => {
			if (queuedPush) return queuedPush;
			if (currentPush) {
				queuedPush = currentPush.then(() => {
					const next = pushSchemaLocal(ctx.cwd, ctx.options);
					currentPush = next.finally(() => {
						currentPush = null;
					});
					queuedPush = null;
					return currentPush;
				});
				return queuedPush;
			}
			currentPush = pushSchemaLocal(ctx.cwd, ctx.options).finally(() => {
				currentPush = null;
			});
			return currentPush;
		};

		bus.on(Init.Prompt, async (p) => {
			const dialect = await ctx.prompt.select("Database dialect:", [
				{ label: "D1 (Cloudflare)", value: "d1" as const },
				{ label: "SQLite (local)", value: "sqlite" as const },
			]);
			const answers: Record<string, unknown> = { dialect };
			if (dialect === "d1") {
				answers.databaseId = await ctx.prompt.text("D1 database ID:", {
					default: "YOUR_D1_DATABASE_ID",
				});
			} else {
				answers.path = await ctx.prompt.text("SQLite file path:", {
					default: "./data/app.sqlite",
				});
			}
			p.configOptions.db = answers;
		});

		bus.on(Init.Scaffold, (p) => {
			p.files.push({
				path: "src/schema/index.ts",
				content: SCHEMA_TEMPLATE,
			});
			p.dependencies["@fcalell/plugin-db"] = "workspace:*";
			p.devDependencies["drizzle-kit"] = "^0.31.0";
			p.devDependencies.tsx = "^4.19.0";
			p.gitignore.push(".db-kit");
		});

		bus.on(Generate, (p) => {
			if (ctx.options?.dialect === "d1") {
				p.bindings.push({
					name: ctx.options.binding ?? "DB_MAIN",
					type: "d1",
					databaseId: ctx.options.databaseId,
					databaseName: ctx.options.databaseId,
				});
			}
		});

		bus.on(Codegen.Worker, async (p) => {
			p.imports.push(`import dbRuntime from "@fcalell/plugin-db/runtime";`);
			const opts = serialize(ctx.options ?? {});
			const hasSchema = await ctx.fileExists("src/schema");
			if (hasSchema) {
				p.imports.push('import * as schema from "../src/schema";');
				p.useLines.push(`\t.use(dbRuntime({ ...${opts}, schema }))`);
			} else {
				p.useLines.push(`\t.use(dbRuntime(${opts}))`);
			}
		});

		bus.on(Remove, (p) => {
			p.files.push("src/schema/", "src/migrations/");
			p.dependencies.push("@fcalell/plugin-db", "drizzle-kit", "tsx");
		});

		bus.on(Dev.Ready, (p) => {
			p.setup.push({
				name: "db-schema-push",
				run: async () => {
					ctx.log.info("Pushing schema to local database...");
					await serializedPush();
					ctx.log.success("Schema pushed");
					await bus.emit(events.SchemaReady);
				},
			});

			p.watchers.push({
				name: "schema",
				paths: "src/schema/**",
				ignore: ["**/seed.ts"],
				debounce: 300,
				handler: async () => {
					ctx.log.info("Schema change detected, re-pushing...");
					await serializedPush();
					ctx.log.success("Schema pushed");
					await bus.emit(events.SchemaReady);
				},
			});
		});

		bus.on(Deploy.Plan, async (p) => {
			if (ctx.options.dialect !== "d1") return;
			const migrations = await generateMigrations(ctx.cwd, ctx.options);
			if (migrations.length > 0) {
				p.checks.push({
					plugin: "db",
					description: `${migrations.length} pending migration(s)`,
					items: migrations.map((m) => ({ label: m.name })),
					action: () => applyMigrationsRemote(ctx.cwd, ctx.options),
				});
			}
		});

		bus.on(Deploy.Execute, (p) => {
			if (ctx.options.dialect !== "d1") return;
			p.steps.push({
				name: "Database migrations",
				phase: "pre",
				run: () => applyMigrationsRemote(ctx.cwd, ctx.options),
			});
		});
	},
});

export type { DbOptions } from "./types";
