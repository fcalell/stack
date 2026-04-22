import { join } from "node:path";
import { plugin } from "@fcalell/cli";
import type { TsImportSpec } from "@fcalell/cli/ast";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { PluginRuntimeEntry } from "@fcalell/plugin-api";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import {
	applyMigrationsLocal,
	applyMigrationsRemote,
	generateMigrations,
	pushSchemaLocal,
} from "./node/push";
import { type DbOptions, dbOptionsSchema } from "./types";

// Local module-scoped serializer so both the devReadySetup task and the
// schema watcher's handler share the same in-flight / queued lock — without
// it concurrent invocations would race on SQLite's file-level lock.
function createSerializedPush(cwd: string, options: DbOptions) {
	let currentPush: Promise<void> | null = null;
	let queuedPush: Promise<void> | null = null;
	return function serializedPush(): Promise<void> {
		if (queuedPush) return queuedPush;
		if (currentPush) {
			queuedPush = currentPush.then(() => {
				const next = pushSchemaLocal(cwd, options);
				currentPush = next.finally(() => {
					currentPush = null;
				});
				queuedPush = null;
				return currentPush;
			});
			return queuedPush;
		}
		currentPush = pushSchemaLocal(cwd, options).finally(() => {
			currentPush = null;
		});
		return currentPush;
	};
}

export const db = plugin<"db", DbOptions>("db", {
	label: "Database",

	schema: dbOptionsSchema,

	requires: ["cloudflare", "api"],

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

	contributes: [
		// Init prompts: dialect + D1/SQLite-specific follow-up.
		cliSlots.initPrompts.contribute((ctx) => ({
			plugin: "db",
			ask: async (innerCtx) => {
				const c = innerCtx as typeof ctx;
				const dialect = await (
					c as unknown as {
						prompt: {
							select: <T>(
								msg: string,
								options: { label: string; value: T }[],
							) => Promise<T>;
							text: (
								msg: string,
								opts?: { default?: string },
							) => Promise<string>;
						};
					}
				).prompt.select("Database dialect:", [
					{ label: "D1 (Cloudflare)", value: "d1" as const },
					{ label: "SQLite (local)", value: "sqlite" as const },
				]);
				const answers: Record<string, unknown> = { dialect };
				if (dialect === "d1") {
					answers.databaseId = await (
						c as unknown as {
							prompt: {
								text: (
									msg: string,
									opts?: { default?: string },
								) => Promise<string>;
							};
						}
					).prompt.text("D1 database ID:", {
						default: "YOUR_D1_DATABASE_ID",
					});
				} else {
					answers.path = await (
						c as unknown as {
							prompt: {
								text: (
									msg: string,
									opts?: { default?: string },
								) => Promise<string>;
							};
						}
					).prompt.text("SQLite file path:", {
						default: "./data/app.sqlite",
					});
				}
				return answers;
			},
		})),

		// Schema template scaffold (the callbacks auto-wire in create-plugin
		// handles the callback file; `db` has no callbacks, only a schema).
		cliSlots.initScaffolds.contribute((ctx) =>
			ctx.scaffold("schema.ts", "src/schema/index.ts"),
		),

		// D1 binding — only for the d1 dialect, and only when `databaseId`
		// is set. Contribution is pure; wrangler aggregator reads all
		// contributions at once.
		cloudflare.slots.bindings.contribute((ctx) => {
			const options = ctx.options as DbOptions;
			if (options.dialect !== "d1") return undefined;
			const databaseId = options.databaseId;
			if (!databaseId) return undefined;
			return {
				kind: "d1",
				binding: options.binding ?? "DB_MAIN",
				databaseName: databaseId,
				databaseId,
			};
		}),

		// Worker runtime entry — only for d1 (sqlite's better-sqlite3 can't
		// run in the Workers isolate).
		api.slots.pluginRuntimes.contribute(
			async (ctx): Promise<PluginRuntimeEntry | undefined> => {
				const options = ctx.options as DbOptions;
				if (options.dialect !== "d1") return undefined;
				const hasSchema = await ctx.fileExists("src/schema");
				return {
					plugin: "db",
					import: {
						source: "@fcalell/plugin-db/runtime",
						default: "dbRuntime",
					},
					identifier: "dbRuntime",
					options: {
						binding: {
							kind: "string",
							value: options.binding ?? "DB_MAIN",
						},
						...(hasSchema
							? { schema: { kind: "identifier", name: "schema" } as const }
							: {}),
					},
				};
			},
		),

		// Schema namespace import — gated on the schema directory existing,
		// same as the runtime entry's `schema` option.
		api.slots.workerImports.contribute(
			async (ctx): Promise<TsImportSpec | undefined> => {
				const options = ctx.options as DbOptions;
				if (options.dialect !== "d1") return undefined;
				const hasSchema = await ctx.fileExists("src/schema");
				if (!hasSchema) return undefined;
				return { source: "../src/schema", namespace: "schema" };
			},
		),

		// Local schema push at `stack dev` Ready time.
		cliSlots.devReadySetup.contribute((ctx) => {
			const options = ctx.options as DbOptions;
			const serializedPush = createSerializedPush(ctx.cwd, options);
			return {
				name: "db-schema-push",
				run: async () => {
					ctx.log.info("Pushing schema to local database...");
					await serializedPush();
					ctx.log.success("Schema pushed");
				},
			};
		}),

		// Schema watcher — re-push when files change, serialized alongside
		// the setup task via a module-level latch created per contribution.
		cliSlots.devWatchers.contribute((ctx) => {
			const options = ctx.options as DbOptions;
			const serializedPush = createSerializedPush(ctx.cwd, options);
			return {
				name: "schema",
				paths: "src/schema/**",
				ignore: ["**/seed.ts"],
				debounce: 300,
				handler: async () => {
					ctx.log.info("Schema change detected, re-pushing...");
					await serializedPush();
					ctx.log.success("Schema pushed");
				},
			};
		}),

		// Deploy-time migration check — only for d1.
		cliSlots.deployChecks.contribute(async (ctx) => {
			const options = ctx.options as DbOptions;
			if (options.dialect !== "d1") return undefined;
			const migrations = await generateMigrations(ctx.cwd, options);
			if (migrations.length === 0) return undefined;
			return {
				plugin: "db",
				description: `${migrations.length} pending migration(s)`,
				items: migrations.map((m) => ({ label: m.name })),
				action: () => applyMigrationsRemote(ctx.cwd, options),
			};
		}),

		// Deploy-time migration execution — only for d1.
		cliSlots.deploySteps.contribute((ctx) => {
			const options = ctx.options as DbOptions;
			if (options.dialect !== "d1") return undefined;
			return {
				name: "Database migrations",
				phase: "pre",
				run: () => applyMigrationsRemote(ctx.cwd, options),
			};
		}),

		// Clean up schema + migrations directories on `stack remove db`.
		cliSlots.removeFiles.contribute(() => ["src/schema/", "src/migrations/"]),
	],
});

export type { DbOptions } from "./types";
