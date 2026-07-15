import { spawnSync } from "node:child_process";
import {
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import type { Readable } from "node:stream";
import { defineConfig } from "@fcalell/cli";
import { runStackGenerate } from "@fcalell/cli/testing";
import esbuild, { type Plugin } from "esbuild";
import { Miniflare } from "miniflare";
import { parse as parseToml } from "smol-toml";

// Boots the emitted `.stack/worker.ts` for real, under workerd (via
// Miniflare), with real bindings — D1, rate limiters. Sibling to
// worker-runtime.test.ts's tsx-subprocess harness: same
// runStackGenerate → write files → boot shape, minus the bindings.

const INTEGRATION_ROOT = resolve(import.meta.dirname);
const NODE_MODULES = resolve(INTEGRATION_ROOT, "node_modules");
const WORKSPACE = resolve(INTEGRATION_ROOT, `.tmp-miniflare-${process.pid}`);
const DRIZZLE_KIT_BIN = resolve(NODE_MODULES, ".bin/drizzle-kit");

type D1Database = Awaited<ReturnType<Miniflare["getD1Database"]>>;

export interface RateLimiterSpec {
	limit: number;
	period?: 10 | 60;
}

export interface Fixture {
	label: string;
	plugins: Parameters<typeof runStackGenerate>[0]["config"]["plugins"];
	origins?: string[];
	seed: Record<string, string>;
	// Extra/override plain-text bindings — e.g. `{ STACK_DEV: "1" }` to
	// simulate dev mode. Absent by default: production-like, since rate-limit
	// behaviour (`_devMode` bypasses it entirely) needs production semantics.
	env?: Record<string, string>;
	// Override a `[[unsafe.bindings]]` ratelimit entry's simulated limiter,
	// keyed by binding name (e.g. "RATE_LIMITER_IP"). Miniflare validates
	// `limit > 0`, so an always-denying limiter isn't expressible — use
	// `{ limit: 1 }` and burn the quota with one request; the default
	// (generous) limit allows anything a test throws at it. `period` must be
	// 10 or 60 seconds — same constraint the framework's wrangler codegen now
	// enforces, so this only matters for a test override.
	rateLimiters?: Record<string, RateLimiterSpec>;
}

export interface MiniflareWorker {
	mf: Miniflare;
	cwd: string;
	dispatch: Miniflare["dispatchFetch"];
	d1: D1Database;
	dispose(): Promise<void>;
	// Combined stdout+stderr the workerd process has printed so far (e.g. the
	// error-logging procedure middleware's `console.error("[api] Unexpected
	// procedure error:", ...)`). Captured via Miniflare's `handleRuntimeStdio`
	// — additive, still tees to the real process stdio for local debugging.
	consoleOutput(): string;
}

// ---------------------------------------------------------------------------
// esbuild workerd-compat shims
//
// The emitted worker imports real npm packages (better-auth, hono, drizzle)
// whose dependency graphs weren't all written with a bundler-into-workerd
// target in mind. Each shim below papers over one concrete break found by
// bundling the auth fixture; see the report for the empirical trail.
// ---------------------------------------------------------------------------

// better-auth's core `init.mjs` statically imports `getMigrations` (for its
// optional kysely-driven `runMigrations()` helper) and `getKyselyDatabaseType`
// from `@better-auth/kysely-adapter`, even though this worker only ever uses
// `drizzleAdapter` and never calls `runMigrations()`. That package's own
// sqlite dialect files import `DEFAULT_MIGRATION_LOCK_TABLE` /
// `DEFAULT_MIGRATION_TABLE` from `kysely`, names the installed kysely version
// doesn't export — a real version mismatch in the dependency tree, unrelated
// to this harness. Stub the two exports actually referenced (both dead code
// on the drizzleAdapter path) so the bundle doesn't need to resolve the
// broken chain at all.
const stubBetterAuthKyselyAdapterPlugin: Plugin = {
	name: "stub-better-auth-kysely-adapter",
	setup(build) {
		build.onResolve({ filter: /^@better-auth\/kysely-adapter$/ }, (args) => ({
			path: args.path,
			namespace: "stub-kysely-adapter",
		}));
		build.onLoad({ filter: /.*/, namespace: "stub-kysely-adapter" }, () => ({
			contents: `
export function createKyselyAdapter() { throw new Error("kysely adapter unused (drizzleAdapter in use)"); }
export function getKyselyDatabaseType() { throw new Error("kysely adapter unused (drizzleAdapter in use)"); }
`,
			loader: "js",
		}));
	},
};

// Hono's color util does `const cfWorkers = "cloudflare:workers"; await
// import(cfWorkers)` to detect NO_COLOR inside Workers. The specifier is a
// local const, not a string literal, so esbuild can't prove it's statically
// resolvable — Miniflare's module linker (which must enumerate every import
// target up front) rejects that with ERR_MODULE_DYNAMIC_SPEC. Rewrite the
// source to a literal `import("cloudflare:workers")` at load time so both
// esbuild and Miniflare see a real, resolvable import.
const fixHonoDynamicImportPlugin: Plugin = {
	name: "fix-hono-cf-workers-dynamic-import",
	setup(build) {
		build.onLoad(
			{ filter: /hono[\\/]dist[\\/]utils[\\/]color\.(m?js)$/ },
			(args) => {
				const source = readFileSync(args.path, "utf8");
				const patched = source.replace(
					/import\(cfWorkers\)/,
					'import("cloudflare:workers")',
				);
				return { contents: patched, loader: "js" };
			},
		);
	},
};

// Consumer "callbacks" files (`src/worker/plugins/<plugin>.ts`) import the
// plugin's `AuthCallbacks` type from the worker-safe `@fcalell/plugin-auth/runtime`
// subpath (plugins/auth/templates/callbacks.ts), never the plugin's config-side
// "." entrypoint — that entrypoint pulls in the entire CLI codegen toolchain
// (ts-morph, node:fs, node:child_process) to build the slot graph, none of it
// workerd-compatible or reachable at request time. No stub is needed here: the
// real module graph the worker imports never reaches that entrypoint, so this
// is exactly what production `wrangler deploy` bundles.

// Some dependency somewhere in the real module graph may still reach for
// `node:fs`. It's always a dead code path at request time (file access has no
// meaning inside a Worker) — but workerd's `nodejs_compat` doesn't provide a
// virtual `fs` (there's no filesystem to polyfill), so an unresolved static
// import fails the bundle outright. Stub it to throw if ever actually called.
const stubNodeFsPlugin: Plugin = {
	name: "stub-node-fs",
	setup(build) {
		build.onResolve({ filter: /^node:fs(\/promises)?$/ }, (args) => ({
			path: args.path,
			namespace: "stub-node-fs",
		}));
		build.onLoad({ filter: /.*/, namespace: "stub-node-fs" }, () => ({
			contents: `
function unsupported() { throw new Error("node:fs is unavailable in Workers"); }
export const readFileSync = unsupported;
export const writeFileSync = unsupported;
export const existsSync = () => false;
export const readdirSync = unsupported;
export const mkdirSync = unsupported;
export const rmSync = unsupported;
export const readFile = unsupported;
export const writeFile = unsupported;
export const mkdir = unsupported;
export const readdir = unsupported;
export default { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync, readFile, writeFile, mkdir, readdir };
`,
			loader: "js",
		}));
	},
};

// `virtual:stack-procedure` (plugin-api's generated `.stack/procedure.ts`
// target — see plugin-api/README.md "Write procedures") is resolved via a
// tsconfig `paths` alias, not a bundler virtual-module plugin (the worker
// never runs through Vite). esbuild reads `paths` from a real tsconfig.json
// natively; write a minimal one so `bundleWorker` resolves the alias the
// same way a consumer's own tsconfig (packages/cli/src/templates/tsconfig.ts)
// would.
function writeProcedureTsconfig(cwd: string): void {
	writeFileSync(
		resolve(cwd, "tsconfig.json"),
		JSON.stringify(
			{
				compilerOptions: {
					paths: { "virtual:stack-procedure": ["./.stack/procedure.ts"] },
				},
			},
			null,
			"\t",
		),
	);
}

async function bundleWorker(cwd: string): Promise<string> {
	const entry = resolve(cwd, ".stack/worker.ts");
	const outfile = resolve(cwd, ".stack/worker.bundle.js");
	await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		format: "esm",
		platform: "browser",
		conditions: ["workerd", "worker", "browser"],
		external: ["cloudflare:*", "node:*"],
		tsconfig: resolve(cwd, "tsconfig.json"),
		plugins: [
			stubBetterAuthKyselyAdapterPlugin,
			fixHonoDynamicImportPlugin,
			stubNodeFsPlugin,
		],
		outfile,
		absWorkingDir: cwd,
	});
	return outfile;
}

interface ParsedWranglerConfig {
	compatibilityDate: string;
	compatibilityFlags: string[];
	d1Bindings: string[];
	varNames: string[];
	rateLimiterBindings: Array<{ name: string; limit: number; period: number }>;
}

function parseWranglerConfig(cwd: string): ParsedWranglerConfig {
	const raw = readFileSync(resolve(cwd, ".stack/wrangler.toml"), "utf8");
	// biome-ignore lint/suspicious/noExplicitAny: TOML parses to an untyped tree; narrowed field-by-field below.
	const doc = parseToml(raw) as any;

	const d1Bindings: string[] = (doc.d1_databases ?? []).map(
		(b: { binding: string }) => b.binding,
	);
	const varNames: string[] = Object.keys(doc.vars ?? {});
	const rateLimiterBindings = (
		(doc.unsafe?.bindings ?? []) as Array<{
			name: string;
			type: string;
			limit: number;
			period: number;
		}>
	)
		.filter((b) => b.type === "ratelimit")
		.map((b) => ({ name: b.name, limit: b.limit, period: b.period }));

	return {
		compatibilityDate: doc.compatibility_date,
		compatibilityFlags: (doc.compatibility_flags ?? []) as string[],
		d1Bindings,
		varNames,
		rateLimiterBindings,
	};
}

// Default values for env vars the framework declared (via `[vars]` in
// wrangler.toml) but whose real values normally live in `.dev.vars` /
// deployment secrets. `AUTH_SECRET` and `APP_URL` get realistic defaults;
// anything else (e.g. a social-provider client id/secret) gets a placeholder
// so `validateEnv()` presence checks pass. Fixtures override via `env`.
function defaultVarValue(name: string): string {
	if (name === "AUTH_SECRET")
		return "test-harness-auth-secret-32-characters-long";
	if (name === "APP_URL") return "http://localhost:3000";
	return "test-value";
}

export async function applyDrizzleMigrations(
	cwd: string,
	d1: D1Database,
): Promise<void> {
	const outDir = ".stack/mf-migrations";
	const absOutDir = resolve(cwd, outDir);
	rmSync(absOutDir, { recursive: true, force: true });

	const configPath = resolve(cwd, ".stack/drizzle-mf.config.ts");
	writeFileSync(
		configPath,
		`import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema/index.ts",
  out: ${JSON.stringify(outDir)},
});
`,
		"utf-8",
	);

	const result = spawnSync(
		DRIZZLE_KIT_BIN,
		["generate", "--config", ".stack/drizzle-mf.config.ts"],
		{ cwd, stdio: "pipe", encoding: "utf-8" },
	);
	if (result.status !== 0) {
		throw new Error(
			`drizzle-kit generate failed:\n${result.stderr || result.stdout}`,
		);
	}

	const files = readdirSync(absOutDir)
		.filter((f) => f.endsWith(".sql"))
		.sort();

	for (const file of files) {
		const sql = readFileSync(resolve(absOutDir, file), "utf-8");
		const statements = sql
			.split("--> statement-breakpoint")
			.map((s) => s.trim())
			.filter(Boolean);
		if (statements.length === 0) continue;
		await d1.batch(statements.map((s) => d1.prepare(s)));
	}
}

export async function emitWorkerMiniflare(
	fixture: Fixture,
): Promise<MiniflareWorker> {
	const cwd = resolve(WORKSPACE, fixture.label);
	rmSync(cwd, { recursive: true, force: true });
	mkdirSync(cwd, { recursive: true });
	symlinkSync(NODE_MODULES, resolve(cwd, "node_modules"), "dir");

	for (const [path, content] of Object.entries(fixture.seed)) {
		const abs = resolve(cwd, path);
		mkdirSync(resolve(abs, ".."), { recursive: true });
		writeFileSync(abs, content);
	}

	const config = defineConfig({
		app: {
			name: "worker-miniflare-test",
			domain: "example.com",
			origins: fixture.origins,
		},
		plugins: fixture.plugins,
	});

	const result = await runStackGenerate({ config, cwd });
	for (const file of result.files) {
		const abs = resolve(cwd, file.path);
		mkdirSync(resolve(abs, ".."), { recursive: true });
		writeFileSync(abs, file.content);
	}

	writeProcedureTsconfig(cwd);

	const wranglerConfig = parseWranglerConfig(cwd);
	const scriptPath = await bundleWorker(cwd);

	const bindings: Record<string, string> = {};
	for (const name of wranglerConfig.varNames) {
		bindings[name] = defaultVarValue(name);
	}
	Object.assign(bindings, fixture.env);

	const d1Databases: Record<string, string> = {};
	for (const binding of wranglerConfig.d1Bindings) {
		d1Databases[binding] = `${fixture.label}-${binding}`;
	}

	const ratelimits: Record<
		string,
		{ simple: { limit: number; period: 10 | 60 } }
	> = {};
	for (const { name, limit, period } of wranglerConfig.rateLimiterBindings) {
		const override = fixture.rateLimiters?.[name];
		ratelimits[name] = {
			simple: {
				// Generous default (framework's declared limit) so ordinary
				// fixtures don't trip 429s. `period` comes straight from the
				// emitted wrangler.toml — the codegen validation guarantees it's
				// already 10 or 60, so no pinning/override is needed by default.
				limit: override?.limit ?? limit,
				period: override?.period ?? (period as 10 | 60),
			},
		};
	}

	const consoleChunks: string[] = [];
	const mf = new Miniflare({
		modules: true,
		scriptPath,
		compatibilityDate: wranglerConfig.compatibilityDate,
		compatibilityFlags: wranglerConfig.compatibilityFlags,
		d1Databases,
		bindings,
		ratelimits,
		// Capture workerd's stdout/stderr (console.log/error inside the worker)
		// so tests can assert on what the worker actually printed — e.g. the
		// error-logging procedure middleware's non-ORPCError trace. Still tees
		// to the real process stdio so failures remain visible when running
		// tests locally/in CI.
		handleRuntimeStdio(stdout: Readable, stderr: Readable) {
			stdout.on("data", (chunk: Buffer) => {
				consoleChunks.push(chunk.toString("utf-8"));
				process.stdout.write(chunk);
			});
			stderr.on("data", (chunk: Buffer) => {
				consoleChunks.push(chunk.toString("utf-8"));
				process.stderr.write(chunk);
			});
		},
	});

	return {
		mf,
		cwd,
		dispatch: (input, init) => mf.dispatchFetch(input, init),
		d1: await mf.getD1Database(wranglerConfig.d1Bindings[0] ?? "DB_MAIN"),
		dispose: () => mf.dispose(),
		consoleOutput: () => consoleChunks.join(""),
	};
}

// Call once from `afterAll` after every fixture in a test file has disposed
// its Miniflare instance, to clean up the on-disk workspace tree.
export function teardownMiniflareWorkspace(): void {
	rmSync(WORKSPACE, { recursive: true, force: true });
}
