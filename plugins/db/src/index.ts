import { basename, join } from "node:path";
import { plugin } from "@fcalell/cli";
import type { TsImportSpec } from "@fcalell/cli/ast";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { PluginRuntimeEntry } from "@fcalell/plugin-api";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import {
	assertDeployableDatabaseId,
	createD1Database,
	D1_PLACEHOLDER_ID,
	isWranglerAuthed,
} from "./node/d1";
import { extractSchemaEntities } from "./node/entities";
import { migrationLockPath, withMigrationLock } from "./node/lock";
import {
	applyMigrationsLocal,
	applyMigrationsRemote,
	generateMigrations,
	pushSchemaLocal,
} from "./node/push";
import { type DbOptions, dbOptionsSchema } from "./types";

// A COALESCING latch for local schema re-pushes — NOT a serializer.
//
// Cross-process AND in-process *exclusion* is already owned by
// `pushSchemaLocal`, which wraps `withMigrationLock` (file lock + an in-process
// promise queue keyed on the lock path). So this latch deliberately does not
// re-serialize; its one job is to coalesce: when the devReadySetup task and the
// schema watcher fire in quick succession (or a save lands mid-push), collapse
// them into at most one in-flight + one queued push instead of stacking up N
// redundant drizzle-kit runs when only the latest schema matters. (Dropping
// this latch would still be correct — `withMigrationLock` would queue every
// call — but a busy editing session would run a backlog of pointless pushes.)
//
// Scoped to a single `collect()` (graph build) via the `contributes:
// (self) => { ... }` closure: two graphs over the same cwd get independent
// latches, and a long-running watcher's latch is GC'd with its graph.
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

export const db = plugin("db", {
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
				// Wipes `.stack/dev` (which contains the local SQLite db AND the
				// migration lock file). Hold the lock while we tear down so a
				// concurrent push/generate doesn't write into a half-deleted
				// directory.
				await withMigrationLock(migrationLockPath(ctx.cwd), async () => {
					const { rmSync } = await import("node:fs");
					rmSync(join(ctx.cwd, ".stack/dev"), {
						recursive: true,
						force: true,
					});
				});
				ctx.log.success("Local database deleted. Run `stack dev` to recreate.");
			},
		},
		create: {
			description: "Create a Cloudflare D1 database and print its id",
			options: {
				name: {
					type: "string" as const,
					description: "Database name (default: the project directory name)",
				},
			},
			handler: async (ctx, flags) => {
				if (ctx.options.dialect !== "d1") {
					ctx.log.error("`stack db create` only applies to the d1 dialect.");
					return;
				}
				if (!isWranglerAuthed()) {
					ctx.log.error(
						"Not authenticated with Cloudflare. Run `wrangler login` first.",
					);
					return;
				}
				const name = (flags.name as string | undefined) ?? basename(ctx.cwd);
				ctx.log.info(`Creating D1 database "${name}"...`);
				const result = createD1Database(name);
				if (!result.ok) {
					ctx.log.error(result.error);
					return;
				}
				ctx.log.success(`Created D1 database "${result.name}"`);
				ctx.log.info(
					`Set it in stack.config.ts: db({ dialect: "d1", databaseId: "${result.id}" })`,
				);
			},
		},
	},

	contributes: (self) => {
		// Graph-scoped serializer cache. `contributes: (self) => { ... }` runs
		// once per `collect()` (i.e. once per graph build), so this map is
		// closed over by every contribution in this graph and ONLY this graph.
		// Each command builds a fresh graph → fresh map → fresh latches.
		// The setup task and the schema watcher both call `getSharedPush(cwd)`
		// so they share a single in-flight/queued lock per cwd within a graph.
		const sharedPushes = new Map<string, () => Promise<void>>();
		const getSharedPush = (cwd: string): (() => Promise<void>) => {
			let cached = sharedPushes.get(cwd);
			if (!cached) {
				cached = createSerializedPush(cwd, self.options);
				sharedPushes.set(cwd, cached);
			}
			return cached;
		};

		return [
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
							default: D1_PLACEHOLDER_ID,
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
			// contributions at once. `migrationsDir` is required: without it
			// `wrangler d1 migrations apply` silently no-ops at deploy time.
			cloudflare.slots.bindings.contribute(() => {
				if (self.options.dialect !== "d1") return undefined;
				const databaseId = self.options.databaseId;
				if (!databaseId) return undefined;
				return {
					kind: "d1",
					binding: self.options.binding,
					databaseName: databaseId,
					databaseId,
					migrationsDir: self.options.migrations,
				};
			}),

			// Worker runtime entry — only for d1 (sqlite's better-sqlite3 can't
			// run in the Workers isolate).
			api.slots.pluginRuntimes.contribute(
				async (ctx): Promise<PluginRuntimeEntry | undefined> => {
					if (self.options.dialect !== "d1") return undefined;
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
								value: self.options.binding,
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
					if (self.options.dialect !== "d1") return undefined;
					const hasSchema = await ctx.fileExists("src/schema");
					if (!hasSchema) return undefined;
					return { source: "../src/schema", namespace: "schema" };
				},
			),

			// Entity vocabulary handoff (WS3.2, docs/prd/backend-hardening.md) —
			// derives `api.slots.entities` from the consumer's Drizzle schema
			// export names, for BOTH dialects (the vocabulary describes the
			// schema, not the runtime). `undefined` (no `src/schema` dir, or the
			// schema file has no value exports) contributes nothing, leaving
			// `.stack/procedure.ts`'s `Entity` fallback to whatever other
			// plugins contribute (or `string` if none do). `extractSchemaEntities`
			// intentionally skips `export * from "..."` re-exports (see its own
			// doc comment), so a schema file that only re-exports
			// `@fcalell/plugin-auth/schema` contributes nothing here — auth
			// contributes its own table names directly to this same list, so
			// there's no double-contribution to collide with.
			api.slots.entities.contribute(async (ctx) => {
				const hasSchema = await ctx.fileExists("src/schema");
				if (!hasSchema) return undefined;
				const names = extractSchemaEntities(ctx.cwd);
				return names ? [...names] : undefined;
			}),

			// Local schema push at `stack dev` Ready time. Shares its latch with
			// the schema watcher below via `getSharedPush(ctx.cwd)` so that a
			// re-push triggered by a file change while the initial push is
			// still in flight queues behind it instead of racing.
			cliSlots.devReadySetup.contribute((ctx) => {
				const serializedPush = getSharedPush(ctx.cwd);
				return {
					name: "db-schema-push",
					run: async () => {
						ctx.log.info("Pushing schema to local database...");
						await serializedPush();
						ctx.log.success("Schema pushed");
					},
				};
			}),

			// Schema watcher — re-push when files change. Shares the serialized
			// push helper with `devReadySetup` (same graph, same cwd → same
			// latch). Two graphs over the same cwd see independent latches;
			// a stale watcher from a previous graph cannot starve the current
			// graph's pushes.
			cliSlots.devWatchers.contribute((ctx) => {
				const serializedPush = getSharedPush(ctx.cwd);
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

			// Pre-deploy guard — fail fast (before build/migrations touch the
			// cloud) if the d1 databaseId is still the placeholder or isn't a UUID.
			// Resolves during deploy planning, ahead of any check action or step.
			cliSlots.deployChecks.contribute(() => {
				if (self.options.dialect !== "d1") return undefined;
				assertDeployableDatabaseId(self.options.databaseId);
				return undefined;
			}),

			// Deploy-time migration check — only for d1.
			cliSlots.deployChecks.contribute(async (ctx) => {
				if (self.options.dialect !== "d1") return undefined;
				const migrations = await generateMigrations(ctx.cwd, self.options);
				if (migrations.length === 0) return undefined;
				return {
					plugin: "db",
					description: `${migrations.length} pending migration(s)`,
					items: migrations.map((m) => ({ label: m.name })),
					action: () => applyMigrationsRemote(ctx.cwd, self.options),
				};
			}),

			// Deploy-time migration execution — only for d1.
			cliSlots.deploySteps.contribute((ctx) => {
				if (self.options.dialect !== "d1") return undefined;
				return {
					name: "Database migrations",
					phase: "pre",
					run: () => applyMigrationsRemote(ctx.cwd, self.options),
				};
			}),

			// Clean up schema + migrations directories on `stack remove db`.
			cliSlots.removeFiles.contribute(() => ["src/schema/", "src/migrations/"]),
		];
	},
});

export type { DbOptions } from "./types";
