import { basename, join } from "node:path";
import { plugin } from "@fcalell/cli";
import type { TsImportSpec } from "@fcalell/cli/ast";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { StackError } from "@fcalell/cli/errors";
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
	assertNoUnacknowledgedDrops,
	detectLatestDrops,
	detectSchemaDrift,
	formatDropReport,
	hasDrops,
} from "./node/migration-safety";
import {
	applyMigrationsLocal,
	applyMigrationsRemote,
	generateMigrations,
	listMigrationFiles,
	pushSchemaLocal,
} from "./node/push";
import { applySeed } from "./node/seed";
import { dbOptionsSchema } from "./types";

// A COALESCING latch for local schema re-applies — NOT a serializer.
//
// Cross-process AND in-process *exclusion* is already owned by the underlying
// op (`pushSchemaLocal` / `applyMigrationsLocal` both wrap `withMigrationLock`:
// file lock + an in-process promise queue keyed on the lock path). So this latch
// deliberately does not re-serialize; its one job is to coalesce: when the
// devReadySetup task and the schema watcher fire in quick succession (or a save
// lands mid-run), collapse them into at most one in-flight + one queued run
// instead of stacking up N redundant drizzle-kit/wrangler runs when only the
// latest schema matters. (Dropping this latch would still be correct — the lock
// would queue every call — but a busy editing session would run a backlog of
// pointless applies.)
//
// Scoped to a single `collect()` (graph build) via the `contributes:
// (self) => { ... }` closure: two graphs over the same cwd get independent
// latches, and a long-running watcher's latch is GC'd with its graph.
function createSerialized(op: () => Promise<void>): () => Promise<void> {
	let current: Promise<void> | null = null;
	let queued: Promise<void> | null = null;
	return function run(): Promise<void> {
		if (queued) return queued;
		if (current) {
			queued = current.then(() => {
				const next = op();
				current = next.finally(() => {
					current = null;
				});
				queued = null;
				return current;
			});
			return queued;
		}
		current = op().finally(() => {
			current = null;
		});
		return current;
	};
}

export const db = plugin("db", {
	label: "Database",

	schema: dbOptionsSchema,

	requires: ["cloudflare", "api"],

	dependencies: {
		"@fcalell/plugin-db": "workspace:*",
		// drizzle-kit resolves drizzle-orm from the consumer at
		// generate/push time; the plugin's own copy doesn't satisfy it.
		"drizzle-orm": "^0.45.2",
	},
	devDependencies: {
		"drizzle-kit": "^0.31.0",
		// drizzle-kit's sqlite driver for `stack db push` — both dialects
		// push into a local sqlite file (miniflare's for d1).
		"better-sqlite3": "^12.0.0",
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
		check: {
			description: "Check migrations for schema drift and destructive changes",
			handler: async (ctx) => {
				const problems: string[] = [];

				// WS5.2 drift gate — schema edited without `stack db generate`.
				if (detectSchemaDrift(ctx.cwd, ctx.options)) {
					ctx.log.error(
						"Schema drift: `src/schema` has changes with no migration. Run `stack db generate`.",
					);
					problems.push("drift");
				} else {
					ctx.log.success("No schema drift.");
				}

				// WS5.1 destructive gate — newest migration drops a table/column/view.
				const drops = detectLatestDrops(ctx.cwd, ctx.options);
				if (drops && hasDrops(drops.report) && !drops.acknowledged) {
					ctx.log.error(formatDropReport(drops.migration, drops.report));
					problems.push("destructive migration");
				} else {
					ctx.log.success("No unacknowledged destructive changes.");
				}

				if (problems.length > 0) {
					throw new StackError(
						`db check failed: ${problems.join(", ")}`,
						"DB_CHECK",
					);
				}
			},
		},
		seed: {
			description: "Seed the database from src/schema/seed.ts",
			options: {
				remote: {
					type: "boolean" as const,
					description: "Seed the remote (deployed) database",
					default: false,
				},
			},
			handler: async (ctx, flags) => {
				const remote = Boolean(flags.remote);
				const seeded = await applySeed(ctx.cwd, ctx.options, { remote });
				if (seeded) {
					ctx.log.success(`Seeded${remote ? " remote database" : ""}`);
				} else {
					ctx.log.info("No src/schema/seed.ts found — nothing to seed.");
				}
			},
		},
	},

	contributes: (self) => {
		// Graph-scoped serializer cache. `contributes: (self) => { ... }` runs
		// once per `collect()` (i.e. once per graph build), so this map is
		// closed over by every contribution in this graph and ONLY this graph.
		// Each command builds a fresh graph → fresh map → fresh latches.
		// The setup task and the schema/migrations watcher both call
		// `getSharedSchemaApply(cwd)` so they share a single in-flight/queued
		// lock per cwd within a graph.
		//
		// Local dev is push-based for BOTH dialects (WS2.3): drizzle-kit
		// pushes the schema straight into the local database — sqlite's file,
		// or the miniflare-backed D1 that `wrangler dev` reads — so a schema
		// save is live without generating a migration or restarting.
		// Migrations exist for the remote deploy path; `stack db apply` still
		// applies committed ones locally for journal parity when wanted.
		const applySchemaLocal = (cwd: string): Promise<void> =>
			pushSchemaLocal(cwd, self.options);

		const schemaSerializers = new Map<string, () => Promise<void>>();
		const getSharedSchemaApply = (cwd: string): (() => Promise<void>) => {
			let cached = schemaSerializers.get(cwd);
			if (!cached) {
				cached = createSerialized(() => applySchemaLocal(cwd));
				schemaSerializers.set(cwd, cached);
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

			// pnpm v10 blocks dependency build scripts unless approved in
			// pnpm-workspace.yaml (the package.json `pnpm` field is no longer
			// read). Without the approval better-sqlite3's native addon never
			// builds and every local push fails. Both spellings are emitted:
			// `allowBuilds` is current pnpm's setting, `onlyBuiltDependencies`
			// covers earlier v10. A file that already names better-sqlite3 is
			// consumer-managed and stays untouched; one with an approval
			// section missing better-sqlite3 gets a warning instead of a
			// blind append (a duplicate YAML key would corrupt it).
			cliSlots.artifactFiles.contribute(async (ctx) => {
				const block =
					"allowBuilds:\n  better-sqlite3: true\nonlyBuiltDependencies:\n  - better-sqlite3\n";
				const exists = await ctx.fileExists("pnpm-workspace.yaml");
				if (!exists) return { path: "pnpm-workspace.yaml", content: block };
				const existing = await ctx.readFile("pnpm-workspace.yaml");
				if (existing.includes("better-sqlite3")) return undefined;
				if (/^(allowBuilds|onlyBuiltDependencies)\s*:/m.test(existing)) {
					ctx.log.warn(
						"pnpm-workspace.yaml has a build-approval section without better-sqlite3; add it (allowBuilds: better-sqlite3: true) or local db pushes will fail.",
					);
					return undefined;
				}
				const sep = existing.endsWith("\n") ? "" : "\n";
				return {
					path: "pnpm-workspace.yaml",
					content: `${existing}${sep}${block}`,
				};
			}),

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

			// Entity vocabulary handoff (WS3.2) —
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

			// Local schema apply at `stack dev` Ready time. Shares its latch with
			// the schema watcher below via `getSharedSchemaApply(cwd)` so that a
			// re-apply triggered by a file change while the initial apply is
			// still in flight queues behind it instead of racing.
			cliSlots.devReadySetup.contribute((ctx) => {
				const serializedSchema = getSharedSchemaApply(ctx.cwd);
				return {
					name: "db-schema-apply",
					run: async () => {
						ctx.log.info("Applying schema to local database...");
						await serializedSchema();
						ctx.log.success("Schema applied");
					},
				};
			}),

			// Seed at Ready time, AFTER the schema apply task above (readySetup
			// tasks run in contribution order). No-ops silently when the consumer
			// hasn't authored `src/schema/seed.ts`.
			cliSlots.devReadySetup.contribute((ctx) => ({
				name: "db-seed",
				run: async () => {
					const seeded = await applySeed(ctx.cwd, self.options, {
						remote: false,
					});
					if (seeded) ctx.log.success("Seed applied");
				},
			})),

			// Schema watcher — push-based for both dialects (WS2.3): a schema
			// save re-pushes into the local database the running worker reads.
			// Shares the serialized helper with `devReadySetup` (same graph,
			// same cwd → same latch); a stale watcher from a previous graph
			// cannot starve the current graph.
			cliSlots.devWatchers.contribute((ctx) => {
				const serializedSchema = getSharedSchemaApply(ctx.cwd);
				return {
					name: "schema",
					paths: "src/schema/**",
					ignore: ["**/seed.ts"],
					debounce: 300,
					handler: async () => {
						ctx.log.info("Schema change detected, re-pushing...");
						await serializedSchema();
						ctx.log.success("Schema pushed");
					},
				};
			}),

			// Seed watcher — re-seed when `seed.ts` changes (the schema watcher
			// above ignores it). No-ops when the file doesn't exist.
			cliSlots.devWatchers.contribute((ctx) => ({
				name: "seed",
				paths: "src/schema/seed.ts",
				debounce: 300,
				handler: async () => {
					ctx.log.info("Seed change detected, re-seeding...");
					const seeded = await applySeed(ctx.cwd, self.options, {
						remote: false,
					});
					if (seeded) ctx.log.success("Seed applied");
				},
			})),

			// Pre-deploy guard — fail fast (before build/migrations touch the
			// cloud) if the d1 databaseId is still the placeholder or isn't a UUID.
			// Resolves during deploy planning, ahead of any check action or step.
			cliSlots.deployChecks.contribute(() => {
				if (self.options.dialect !== "d1") return undefined;
				assertDeployableDatabaseId(self.options.databaseId);
				return undefined;
			}),

			// WS5.1 destructive-migration hard gate — abort the deploy before any
			// remote migration runs if the newest migration drops a
			// table/column/view without a `-- stack:allow-destructive` marker. A
			// drop breaks the live worker mid-rollout (old code still reads the
			// dropped shape).
			cliSlots.deployChecks.contribute((ctx) => {
				if (self.options.dialect !== "d1") return undefined;
				assertNoUnacknowledgedDrops(ctx.cwd, self.options);
				return undefined;
			}),

			// WS2.2 drift hard gate — schema changes without a committed
			// migration abort the deploy before any step. Deploy never
			// generates migrations; only committed SQL ever applies, so the
			// destructive gate above only ever evaluates committed files.
			cliSlots.deployChecks.contribute((ctx) => {
				if (self.options.dialect !== "d1") return undefined;
				if (detectSchemaDrift(ctx.cwd, self.options)) {
					throw new StackError(
						"Schema drift: `src/schema` has changes with no committed migration. Run `stack db generate` and commit the migration before deploying.",
						"DB_DRIFT",
					);
				}
				return undefined;
			}),

			// Pending-migrations confirm — lists the committed migrations for
			// the deploy plan; the pre-phase step below applies only those
			// still pending remotely (wrangler's journal decides).
			cliSlots.deployChecks.contribute((ctx) => {
				if (self.options.dialect !== "d1") return undefined;
				const files = listMigrationFiles(ctx.cwd, self.options);
				if (files.length === 0) return undefined;
				return {
					plugin: "db",
					description: `${files.length} committed migration(s); pending ones apply before the worker deploys`,
					items: files.map((name) => ({ label: name })),
					// The "Database migrations" pre-phase deploy step owns the
					// apply; a second apply here would just double the call.
					action: async () => {},
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

			// Deploy-time seed — runs after migrations (same `pre` phase, later
			// in contribution order) and only when the consumer authored a seed.
			// Idempotent, so re-running on every deploy is safe.
			cliSlots.deploySteps.contribute(async (ctx) => {
				if (self.options.dialect !== "d1") return undefined;
				if (!(await ctx.fileExists("src/schema/seed.ts"))) return undefined;
				return {
					name: "Database seed",
					phase: "pre",
					run: async () => {
						await applySeed(ctx.cwd, self.options, { remote: true });
					},
				};
			}),

			// Clean up schema + migrations directories on `stack remove db`.
			cliSlots.removeFiles.contribute(() => ["src/schema/", "src/migrations/"]),
		];
	},
});

export type { DbOptions } from "./types";
