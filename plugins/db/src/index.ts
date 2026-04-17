import { join } from "node:path";
import { createPlugin } from "@fcalell/cli";
import { Deploy, Dev, Generate, Init, Remove } from "@fcalell/cli/events";
import {
	applyMigrationsLocal,
	applyMigrationsRemote,
	generateMigrations,
	getMigrationStatus,
	pushSchemaLocal,
} from "./node/push";
import type { DbOptions } from "./types";

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

	config(options: DbOptions) {
		if (options.dialect === "d1" && !options.databaseId) {
			throw new Error("D1 dialect requires databaseId");
		}
		if (options.dialect === "sqlite" && !options.path) {
			throw new Error("SQLite dialect requires path");
		}
		return {
			binding: "DB_MAIN",
			migrations: "./src/migrations",
			...options,
		};
	},

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
		status: {
			description: "Show applied vs pending migrations",
			handler: async (ctx) => {
				const status = await getMigrationStatus(ctx.cwd, ctx.options);
				ctx.log.info(`Applied: ${status.applied}, Pending: ${status.pending}`);
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
		bus.on(Init.Prompt, async () => {
			const dialect = await ctx.prompt.select("Database dialect:", [
				{ label: "D1 (Cloudflare)", value: "d1" as const },
				{ label: "SQLite (local)", value: "sqlite" as const },
			]);
			if (dialect === "d1") {
				await ctx.prompt.text("D1 database ID:", {
					default: "YOUR_D1_DATABASE_ID",
				});
			} else {
				await ctx.prompt.text("SQLite file path:", {
					default: "./data/app.sqlite",
				});
			}
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

		bus.on(Remove, (p) => {
			p.files.push("src/schema/", "src/migrations/");
			p.dependencies.push("@fcalell/plugin-db", "drizzle-kit", "tsx");
		});

		bus.on(Dev.Ready, (p) => {
			p.setup.push({
				name: "db-schema-push",
				run: async () => {
					ctx.log.info("Pushing schema to local database...");
					await pushSchemaLocal(ctx.cwd, ctx.options);
					ctx.log.success("Schema pushed");
					await bus.emit(events.SchemaReady, undefined);
				},
			});

			p.watchers.push({
				name: "schema",
				paths: "src/schema/**",
				ignore: ["**/seed.ts"],
				debounce: 300,
				handler: async () => {
					ctx.log.info("Schema change detected, re-pushing...");
					await pushSchemaLocal(ctx.cwd, ctx.options);
					ctx.log.success("Schema pushed");
					await bus.emit(events.SchemaReady, undefined);
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
