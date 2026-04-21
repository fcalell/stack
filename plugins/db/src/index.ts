import { join } from "node:path";
import { createPlugin } from "@fcalell/cli";
import { Deploy, Dev, Init, Remove } from "@fcalell/cli/events";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import {
	applyMigrationsLocal,
	applyMigrationsRemote,
	generateMigrations,
	pushSchemaLocal,
} from "./node/push";
import { dbOptionsSchema } from "./types";

export const db = createPlugin("db", {
	label: "Database",
	events: ["SchemaReady"],
	after: [cloudflare.events.Wrangler, api.events.Worker],

	schema: dbOptionsSchema,

	dependencies: {
		"@fcalell/plugin-db": "workspace:*",
	},
	devDependencies: {
		"drizzle-kit": "^0.31.0",
		tsx: "^4.19.0",
	},
	gitignore: [".db-kit"],

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
			p.files.push(ctx.scaffold("schema.ts", "src/schema/index.ts"));
		});

		bus.on(cloudflare.events.Wrangler, (p) => {
			if (ctx.options?.dialect !== "d1") return;
			const binding = ctx.options.binding ?? "DB_MAIN";
			const databaseId = ctx.options.databaseId;
			if (!databaseId) return;
			p.bindings.push({
				kind: "d1",
				binding,
				databaseName: databaseId,
				databaseId,
			});
		});

		bus.on(api.events.Worker, async (p) => {
			// The worker runtime currently targets Cloudflare D1 only. The sqlite
			// dialect uses better-sqlite3 which cannot run in the Workers isolate,
			// so we scaffold schema tooling without contributing runtime middleware.
			if (ctx.options?.dialect !== "d1") return;
			const rt = ctx.runtime(p);
			// dbRuntime reads only {binding, schema}; replace the auto-seeded
			// options with just the fields the runtime signature accepts.
			rt.options = {
				binding: { kind: "string", value: ctx.options.binding ?? "DB_MAIN" },
			};
			const hasSchema = await ctx.fileExists("src/schema");
			if (hasSchema) {
				p.imports.push({ source: "../src/schema", namespace: "schema" });
				rt.options.schema = { kind: "identifier", name: "schema" };
			}
		});

		bus.on(Remove, (p) => {
			p.files.push("src/schema/", "src/migrations/");
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
