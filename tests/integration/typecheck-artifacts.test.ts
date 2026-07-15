import {
	existsSync,
	mkdirSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type PluginConfig } from "@fcalell/cli";
import { runStackGenerate } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { solid } from "@fcalell/plugin-solid";
import { solidUi } from "@fcalell/plugin-solid-ui";
import { vite } from "@fcalell/plugin-vite";
import ts from "typescript";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Type-checks the emitted .stack artifacts against the real TS compiler.
//
// Why this sits here rather than in a plugin unit test: the bugs we want to
// catch (stray `extractProcedures` call on a `.handler(routes)` chain where
// the import was dropped, a misspelled identifier, an option typed
// incompatibly with the runtime's declared signature) are structurally
// cross-plugin. The aggregator in any one plugin can be happy; it's the
// composed file that needs to compile.
//
// We drive the same `runStackGenerate` / `defineConfig` path
// `generate-snapshot.test.ts` uses, write the emitted files to a tmpdir
// inside `tests/integration/` (so `node_modules` is resolvable through the
// shared symlink), and spin up a `ts.createProgram` pointed at the emitted
// files plus a deliberately-minimal consumer stub. `--noEmit` is set; we
// assert on `getSemanticDiagnostics` plus `getSyntacticDiagnostics`.

const INTEGRATION_ROOT = resolve(import.meta.dirname);
const NODE_MODULES = resolve(INTEGRATION_ROOT, "node_modules");
const WORKSPACE = resolve(INTEGRATION_ROOT, `.tmp-typecheck-${process.pid}`);

function setupWorkspace(): void {
	rmSync(WORKSPACE, { recursive: true, force: true });
	mkdirSync(WORKSPACE, { recursive: true });
	symlinkSync(NODE_MODULES, resolve(WORKSPACE, "node_modules"), "dir");
}

function teardownWorkspace(): void {
	rmSync(WORKSPACE, { recursive: true, force: true });
}

interface Fixture {
	label: string;
	plugins: readonly PluginConfig[];
	origins?: string[];
	// Seeds to land in the consumer project. Map of relative path → contents.
	seed: Record<string, string>;
}

// Compiles the emitted .stack/ files in-place and returns a list of diagnostic
// messages. Empty list == clean type-check.
async function typeCheckFixture(fixture: Fixture): Promise<string[]> {
	const cwd = resolve(WORKSPACE, fixture.label);
	mkdirSync(cwd, { recursive: true });
	// Seed `.ts`/`.tsx` files (route handlers, callback files, middleware) are
	// fed into the program as root files too, not just imported transitively
	// from a generated root — `getSemanticDiagnostics()` checks every file in
	// the program, but the `emittedSet` filter below only keeps diagnostics
	// for files this function itself knows about. A seed file reachable only
	// via `export *` (e.g. a route handler pulled in through the generated
	// barrel) would otherwise type-check silently: TS parses and checks it as
	// part of the program, but its diagnostics get dropped by the filter
	// because the file's path was never recorded here.
	const typescriptFiles: string[] = [];
	for (const [path, content] of Object.entries(fixture.seed)) {
		const abs = resolve(cwd, path);
		mkdirSync(resolve(abs, ".."), { recursive: true });
		writeFileSync(abs, content);
		if (
			path.endsWith(".ts") ||
			path.endsWith(".tsx") ||
			path.endsWith(".d.ts")
		) {
			typescriptFiles.push(abs);
		}
	}

	const config = defineConfig({
		app: {
			name: "typecheck-test",
			domain: "example.com",
			origins: fixture.origins,
		},
		plugins: fixture.plugins,
	});
	const result = await runStackGenerate({ config, cwd });

	// Write every emitted file to disk. Some artifacts (like .stack/app.css)
	// don't type-check and are fine to skip — we only feed TS-consumable files
	// into the program.
	for (const file of result.files) {
		const abs = resolve(cwd, file.path);
		mkdirSync(resolve(abs, ".."), { recursive: true });
		writeFileSync(abs, file.content);
		if (
			file.path.endsWith(".ts") ||
			file.path.endsWith(".tsx") ||
			file.path.endsWith(".d.ts")
		) {
			typescriptFiles.push(abs);
		}
	}

	// `.stack/worker.ts` expects a worker-configuration.d.ts with the Env
	// interface declared globally (wrangler types would generate it on disk).
	// Supply a minimal stub so the compilation doesn't fail on missing Env.
	const workerConfig = resolve(cwd, ".stack/worker-configuration.d.ts");
	if (!existsSync(workerConfig)) {
		writeFileSync(
			workerConfig,
			`// Test stub for wrangler-generated types.
declare global {
	interface Env {
		DB_MAIN?: unknown;
		AUTH_SECRET?: string;
		APP_URL?: string;
		RATE_LIMITER_IP?: unknown;
		RATE_LIMITER_EMAIL?: unknown;
	}
}
export {};
`,
		);
		typescriptFiles.push(workerConfig);
	}

	// `.stack/entry.tsx` imports two Vite-only virtual modules — they have
	// no physical type declarations because the Vite plugin synthesizes them
	// at build time. Provide ambient decls here; a real consumer's tsconfig
	// would pull in `@fcalell/plugin-vite/virtual.d.ts` (or similar) for this.
	const virtualDts = resolve(cwd, ".stack/virtual-modules.d.ts");
	if (!existsSync(virtualDts)) {
		writeFileSync(
			virtualDts,
			`// Test stub for Vite virtual modules.
declare module "virtual:fcalell-routes" {
	import type { RouteDefinition } from "@solidjs/router";
	export const routes: RouteDefinition[];
}
declare module "virtual:stack-providers" {
	import type { JSX } from "solid-js";
	const Providers: (props: { children: JSX.Element }) => JSX.Element;
	export default Providers;
}
`,
		);
		typescriptFiles.push(virtualDts);
	}

	if (typescriptFiles.length === 0) {
		// Nothing to compile — treated as vacuously passing. The caller
		// shouldn't configure a fixture that emits zero TS files.
		return [];
	}

	// Compile with settings that match the integration test project's
	// base tsconfig (node-tsx → extends base.json: strict, ES2022, ESNext,
	// bundler module resolution equivalent). Point at the tmp dir's
	// node_modules so `@fcalell/*` package resolution walks into the real
	// plugin source via the symlinked tree.
	const compilerOptions: ts.CompilerOptions = {
		noEmit: true,
		strict: true,
		skipLibCheck: true,
		esModuleInterop: true,
		isolatedModules: true,
		resolveJsonModule: true,
		target: ts.ScriptTarget.ES2022,
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		jsx: ts.JsxEmit.Preserve,
		jsxImportSource: "solid-js",
		lib: ["lib.esnext.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
		baseUrl: cwd,
		rootDir: cwd,
		types: [],
		allowImportingTsExtensions: false,
		noUncheckedIndexedAccess: true,
		moduleDetection: ts.ModuleDetectionKind.Force,
		// Mirrors `packages/cli/src/templates/tsconfig.ts`'s `PROCEDURE_PATHS` —
		// route-file fixtures import `procedure` from the same virtual specifier
		// a real consumer's tsconfig `paths` alias resolves to `.stack/procedure.ts`.
		paths: { "virtual:stack-procedure": ["./.stack/procedure.ts"] },
	};

	const program = ts.createProgram({
		rootNames: typescriptFiles,
		options: compilerOptions,
	});

	// Filter diagnostics to files we actually emitted — library/.d.ts noise
	// from deep dependencies is not our problem here.
	const emittedSet = new Set(typescriptFiles.map((f) => resolve(f)));
	const diagnostics = [
		...program.getSyntacticDiagnostics(),
		...program.getSemanticDiagnostics(),
	].filter((d) => {
		if (!d.file) return true;
		return emittedSet.has(resolve(d.file.fileName));
	});

	return diagnostics.map((d) => {
		const file = d.file?.fileName ?? "<unknown>";
		const relFile = file.replace(`${cwd}/`, "");
		const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n");
		if (d.file && d.start !== undefined) {
			const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
			return `${relFile}:${line + 1}:${character + 1}: ${msg}`;
		}
		return `${relFile}: ${msg}`;
	});
}

describe("emitted artifacts type-check cleanly", () => {
	beforeAll(() => {
		setupWorkspace();
	});

	afterAll(() => {
		teardownWorkspace();
	});

	it("worker-only (db + api) emits a type-safe .stack/worker.ts", async () => {
		const diagnostics = await typeCheckFixture({
			label: "worker-only",
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "tc-worker" }),
				api(),
			],
			seed: {
				"src/schema/index.ts": "export const tables = {};\n",
				"src/worker/routes/index.ts": "// empty barrel\n",
			},
		});
		expect(diagnostics).toEqual([]);
	});

	it("full-stack (db + auth + api + vite + solid + solid-ui) type-checks", async () => {
		const diagnostics = await typeCheckFixture({
			label: "full-stack",
			origins: [
				"https://example.com",
				"https://app.example.com",
				"http://localhost:3000",
			],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "tc-full" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
				vite({ port: 3000 }),
				solid({ routes: false }),
				solidUi(),
			],
			seed: {
				"src/schema/index.ts": "export const tables = {};\n",
				"src/worker/routes/index.ts": "// empty barrel\n",
				"src/worker/middleware.ts":
					"import type { MiddlewareHandler } from 'hono';\n" +
					"const middleware: MiddlewareHandler = async (_c, next) => { await next(); };\n" +
					"export default middleware;\n",
				"src/worker/plugins/auth.ts":
					'import type { AuthCallbacks } from "@fcalell/plugin-auth/runtime";\n' +
					"const callbacks: AuthCallbacks = { sendOTP: async () => {} };\n" +
					"export default callbacks;\n",
			},
		});
		expect(diagnostics).toEqual([]);
		// The largest fixture: its tsc run sits near the default 5s budget and
		// flakes under a loaded full-suite run.
	}, 20_000);

	it("frontend-only (vite + solid) emits type-safe entry.tsx + vite.config.ts", async () => {
		const diagnostics = await typeCheckFixture({
			label: "frontend-only",
			plugins: [vite({ port: 3000 }), solid({ routes: false })],
			seed: {},
		});
		// Frontend config currently emits no `.ts` consumer files besides
		// .stack/entry.tsx and .stack/vite.config.ts. Both must type-check.
		expect(diagnostics).toEqual([]);
	});

	it("worker-only with auth (no frontend) type-checks", async () => {
		const diagnostics = await typeCheckFixture({
			label: "worker-auth",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "tc-wauth" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
			],
			seed: {
				"src/schema/index.ts": "export const tables = {};\n",
				"src/worker/plugins/auth.ts":
					'import type { AuthCallbacks } from "@fcalell/plugin-auth/runtime";\n' +
					"const callbacks: AuthCallbacks = { sendOTP: async () => {} };\n" +
					"export default callbacks;\n",
				// Real end-to-end assertion for `InferAuthContext`
				// (plugins/api/src/procedure.ts): `authRuntime`'s context must carry
				// a typed `$Infer.Session` (not `any`) so `procedure({ auth: true })`
				// narrows `context.user.id` to `string`. Pre-fix, `AuthInstance` was
				// `any`, which collapsed this to an untyped context and let a
				// mistyped `context.user.id` slip past `tsc` silently — this
				// assignment is the regression guard. `hasRoutableFiles` picks this
				// file up, which generates a real barrel + `.stack/procedure.ts`.
				"src/worker/routes/me.ts":
					'import { procedure } from "virtual:stack-procedure";\n\n' +
					"export const me = procedure({ auth: true }).handler(({ context }) => {\n" +
					"\tconst id: string = context.user.id;\n" +
					"\treturn { id };\n" +
					"});\n",
			},
		});
		expect(diagnostics).toEqual([]);
	});

	// M3: `.stack/procedure.ts`'s rebuilt `__chain` must mirror the real
	// worker's middleware chain too, not just `pluginRuntimes` — a
	// context-injecting middleware (arity-1 `(ctx) => extra`, see
	// `AppBuilder.use`'s third overload) extends the request context, and a
	// route handler reading that extra key must see its narrow type, not
	// `unknown`/absent. Regression guard: pre-fix, `context.requestId` below
	// would have failed to type-check (the key wasn't in `WorkerContext` at
	// all) because `buildChain` only rebuilt base + pluginRuntimes.
	it("a context-injecting src/worker/middleware.ts's extra key is typed on virtual:stack-procedure's context", async () => {
		const diagnostics = await typeCheckFixture({
			label: "middleware-context-injection",
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "tc-mw-ctx" }),
				api(),
			],
			seed: {
				"src/schema/index.ts": "export const tables = {};\n",
				"src/worker/middleware.ts":
					'import type { BaseContext } from "@fcalell/plugin-api/runtime";\n\n' +
					"export default function middleware(ctx: BaseContext) {\n" +
					"\treturn { requestId: crypto.randomUUID() };\n" +
					"}\n",
				"src/worker/routes/ping.ts":
					'import { procedure } from "virtual:stack-procedure";\n\n' +
					"export const ping = procedure().handler(({ context }) => {\n" +
					"\tconst id: string = context.requestId;\n" +
					"\treturn { id };\n" +
					"});\n",
			},
		});
		expect(diagnostics).toEqual([]);
	});

	it("api-without-db (minimal worker) emits nothing; vacuous type-check", async () => {
		// api-only with no runtimes and no routes emits no worker.ts. This is
		// the "null workerSource" path — the test asserts the graph didn't
		// accidentally emit something broken.
		const cwd = resolve(WORKSPACE, "api-only");
		mkdirSync(cwd, { recursive: true });
		const config = defineConfig({
			app: { name: "api-only", domain: "example.com" },
			plugins: [cloudflare(), api()],
		});
		const result = await runStackGenerate({ config, cwd });
		const worker = result.files.find((f) => f.path === ".stack/worker.ts");
		expect(worker).toBeUndefined();
	});
});
