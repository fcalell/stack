import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "@fcalell/cli";
import { runStackGenerate } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Boots the emitted `.stack/worker.ts` the same way `stack dev` does — via
// tsx + node — and hits it with real Request objects. Two layers of
// validation this covers that string-level snapshots can't:
//
//  1. The emitted file actually parses and evaluates as a module in the
//     same loader consumers use in production (tsx). Malformed imports,
//     duplicate identifiers, and missing exports all show up here.
//  2. `createWorker(...).use(...).handler(...)` is callable end-to-end.
//     Regressions like `.handler(routes)` instead of
//     `.handler(extractProcedures(routes))` crash at construction or first
//     request once a routes namespace contains non-procedure exports.
//
// We run under a tsx subprocess rather than vitest's own vite-node loader
// because vite-node's esModuleInterop semantics differ from tsx's (default
// import of a named-only export succeeds in tsx, fails in vite-node). Using
// tsx here guarantees we test the same loader path `stack dev` uses.
//
// Miniflare would give us real bindings but triple test time for coverage
// we don't need here (bindings-level tests belong in a separate harness;
// see report).

const INTEGRATION_ROOT = resolve(import.meta.dirname);
const REPO_ROOT = resolve(INTEGRATION_ROOT, "../..");
const NODE_MODULES = resolve(INTEGRATION_ROOT, "node_modules");
// Resolve tsx's cli script directly — same approach e2e-cli-subprocess uses.
const TSX_CLI = resolve(
	REPO_ROOT,
	"node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs",
);
const WORKSPACE = resolve(INTEGRATION_ROOT, `.tmp-worker-${process.pid}`);

function setupWorkspace(): void {
	rmSync(WORKSPACE, { recursive: true, force: true });
	mkdirSync(WORKSPACE, { recursive: true });
	// Symlink node_modules so resolution of @fcalell/plugin-api/runtime etc.
	// works from inside the tmp workspace (same trick e2e-cli-subprocess uses).
	symlinkSync(NODE_MODULES, resolve(WORKSPACE, "node_modules"), "dir");
}

function teardownWorkspace(): void {
	rmSync(WORKSPACE, { recursive: true, force: true });
}

interface RuntimeResult {
	status: number;
	headers: Record<string, string>;
	body: string;
	threw?: string;
}

interface EmitOutcome {
	workerSource: string;
	cwd: string;
	// Invokes the worker with the given request args and returns its response.
	// Spawns a fresh tsx subprocess per call so each request gets a clean
	// module evaluation — keeps the test hermetic and surfaces module-init
	// failures as thrown errors.
	call: (req: {
		url: string;
		method?: string;
		headers?: Record<string, string>;
		body?: string;
	}) => RuntimeResult;
	// Returns whether module evaluation threw — useful for asserting
	// that construction-time misconfiguration surfaces loudly.
	evaluate: () => { ok: true } | { ok: false; error: string };
}

interface Fixture {
	label: string;
	plugins: Parameters<typeof runStackGenerate>[0]["config"]["plugins"];
	origins?: string[];
	seed: Record<string, string>;
}

async function emitWorker(fixture: Fixture): Promise<EmitOutcome> {
	// Per-test subdir so files don't collide across tests.
	const cwd = resolve(WORKSPACE, fixture.label);
	rmSync(cwd, { recursive: true, force: true });
	mkdirSync(cwd, { recursive: true });

	// Seed consumer files first.
	for (const [path, content] of Object.entries(fixture.seed)) {
		const abs = resolve(cwd, path);
		mkdirSync(resolve(abs, ".."), { recursive: true });
		writeFileSync(abs, content);
	}

	const config = defineConfig({
		app: {
			name: "worker-runtime-test",
			domain: "example.com",
			origins: fixture.origins,
		},
		plugins: fixture.plugins,
	});

	const result = await runStackGenerate({ config, cwd });
	const workerFile = result.files.find((f) => f.path === ".stack/worker.ts");
	if (!workerFile) throw new Error("No .stack/worker.ts emitted");

	// Write every generated file to disk so the spawned tsx sees a complete
	// project tree (routes barrel, schema, callback file, etc.).
	for (const file of result.files) {
		const abs = resolve(cwd, file.path);
		mkdirSync(resolve(abs, ".."), { recursive: true });
		writeFileSync(abs, file.content);
	}

	// Harness: imports the emitted worker, invokes fetch(), writes JSON result
	// between sentinel markers so test output isn't confused by Hono's
	// logger() middleware (which writes request/response lines to stdout).
	// One fresh subprocess per call keeps module-init failures crisp — they
	// surface as the subprocess's stderr + non-zero exit.
	const harnessSource = `
import worker from "./worker.ts";

const request = JSON.parse(process.env.STACK_TEST_REQ ?? "null");
const RESULT_BEGIN = "<<<STACK-TEST-RESULT-BEGIN>>>";
const RESULT_END = "<<<STACK-TEST-RESULT-END>>>";

async function main() {
	if (request === null) {
		// Evaluate-only mode: just importing the worker is enough. Success
		// means the module graph loaded and the builder chain ran.
		process.stdout.write(RESULT_BEGIN + JSON.stringify({ ok: true }) + RESULT_END + "\\n");
		return;
	}

	const req = new Request(request.url, {
		method: request.method ?? "GET",
		headers: request.headers ?? {},
		body: request.body,
	});

	// Mock env bindings: every plugin's validateEnv() fires on every request,
	// so we need to satisfy the presence checks even when the test isn't
	// exercising the underlying binding's behavior. The values are stubs —
	// real I/O isn't expected here (that's a miniflare-tier test).
	const env = {
		DB_MAIN: {
			prepare: () => ({ all: async () => ({ results: [] }), bind: () => ({ all: async () => ({ results: [] }) }) }),
			batch: async () => [],
			exec: async () => ({ count: 0, duration: 0 }),
		},
		AUTH_SECRET: "test-secret",
		APP_URL: "http://localhost:3000",
		RATE_LIMITER_IP: { limit: async () => ({ success: true }) },
		RATE_LIMITER_EMAIL: { limit: async () => ({ success: true }) },
	};
	const res = await worker.fetch(req, env, {});
	const headers = {};
	for (const [k, v] of res.headers.entries()) headers[k] = v;
	const body = await res.text();
	process.stdout.write(RESULT_BEGIN + JSON.stringify({
		status: res.status,
		headers,
		body,
	}) + RESULT_END + "\\n");
}

main().catch((err) => {
	console.error(String(err && err.stack || err));
	process.exit(2);
});
`;
	const harnessPath = resolve(cwd, ".stack/test-harness.ts");
	writeFileSync(harnessPath, harnessSource);

	const runTsx = (
		req: {
			url: string;
			method?: string;
			headers?: Record<string, string>;
			body?: string;
		} | null,
	): { status: number | null; stdout: string; stderr: string } => {
		const result = spawnSync(process.execPath, [TSX_CLI, harnessPath], {
			cwd,
			encoding: "utf8",
			env: {
				...process.env,
				STACK_TEST_REQ: req ? JSON.stringify(req) : "null",
			},
			timeout: 20000,
		});
		return {
			status: result.status,
			stdout: String(result.stdout ?? ""),
			stderr: String(result.stderr ?? ""),
		};
	};

	return {
		workerSource: workerFile.content,
		cwd,
		call: (req) => {
			const out = runTsx(req);
			if (out.status !== 0) {
				return {
					status: -1,
					headers: {},
					body: "",
					threw: out.stderr || out.stdout,
				};
			}
			const match = out.stdout.match(
				/<<<STACK-TEST-RESULT-BEGIN>>>([\s\S]*?)<<<STACK-TEST-RESULT-END>>>/,
			);
			if (!match) {
				throw new Error(
					`Test harness produced no result block. stdout:\n${out.stdout}\nstderr:\n${out.stderr}`,
				);
			}
			const parsed = JSON.parse(match[1] ?? "") as {
				status: number;
				headers: Record<string, string>;
				body: string;
			};
			return parsed;
		},
		evaluate: () => {
			const out = runTsx(null);
			if (out.status !== 0) {
				return { ok: false, error: out.stderr || out.stdout };
			}
			const match = out.stdout.match(
				/<<<STACK-TEST-RESULT-BEGIN>>>([\s\S]*?)<<<STACK-TEST-RESULT-END>>>/,
			);
			if (!match) {
				return {
					ok: false,
					error: `Harness produced no result block. stdout: ${out.stdout} stderr: ${out.stderr}`,
				};
			}
			return { ok: true };
		},
	};
}

// Require tsx up front so a missing dep surfaces as a clear message, not a
// spawn-errno cascade across every test.
if (!existsSync(TSX_CLI)) {
	throw new Error(
		`tsx binary not found at ${TSX_CLI}. Run pnpm install at the repo root.`,
	);
}

describe("emitted worker boots and serves requests", () => {
	beforeAll(() => {
		setupWorkspace();
	});

	afterAll(() => {
		teardownWorkspace();
	});

	it("GET / returns 200 with { ok: true } from the default route", async () => {
		const outcome = await emitWorker({
			label: "basic-get",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "rt-basic" }),
				api(),
			],
			seed: {
				"src/schema/index.ts": "export const tables = {};\n",
			},
		});

		const res = outcome.call({ url: "https://example.com/" });
		expect(res.threw, res.threw).toBeUndefined();
		expect(res.status).toBe(200);
		expect(JSON.parse(res.body)).toEqual({ ok: true });
	});

	it("CORS preflight echoes the configured origin", async () => {
		const outcome = await emitWorker({
			label: "cors-preflight",
			origins: ["https://app.example.com", "https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "rt-cors" }),
				api(),
			],
			seed: {
				"src/schema/index.ts": "export const tables = {};\n",
			},
		});

		const res = outcome.call({
			url: "https://app.example.com/rpc/x",
			method: "OPTIONS",
			headers: {
				Origin: "https://app.example.com",
				"Access-Control-Request-Method": "POST",
				"Access-Control-Request-Headers": "content-type",
			},
		});
		expect(res.threw, res.threw).toBeUndefined();
		// Hono's CORS middleware returns 204 for preflight.
		expect([200, 204]).toContain(res.status);
		expect(res.headers["access-control-allow-origin"]).toBe(
			"https://app.example.com",
		);
		expect(res.headers["access-control-allow-credentials"]).toBe("true");
	});

	it("CORS does not echo origins outside the allow-list", async () => {
		const outcome = await emitWorker({
			label: "cors-reject",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "rt-cors-rej" }),
				api(),
			],
			seed: {
				"src/schema/index.ts": "export const tables = {};\n",
			},
		});

		const res = outcome.call({
			url: "https://example.com/",
			headers: { Origin: "https://evil.com" },
		});
		expect(res.threw, res.threw).toBeUndefined();
		// Hono's cors middleware omits Allow-Origin rather than 403'ing; that's
		// enough — browsers enforce the block. Key negative signal: the Evil
		// origin must not be echoed back.
		const allowed = res.headers["access-control-allow-origin"];
		expect(allowed).not.toBe("https://evil.com");
	});

	it("unknown RPC path returns 404 (router actually mounted)", async () => {
		const outcome = await emitWorker({
			label: "rpc-404",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "rt-404" }),
				api(),
			],
			seed: {
				"src/schema/index.ts": "export const tables = {};\n",
			},
		});

		const res = outcome.call({
			url: "https://example.com/rpc/does.not.exist",
			method: "POST",
			headers: {
				Origin: "https://example.com",
				"content-type": "application/json",
			},
			body: JSON.stringify({ json: {} }),
		});
		expect(res.threw, res.threw).toBeUndefined();
		expect(res.status).toBe(404);
		const body = JSON.parse(res.body) as { code?: string };
		// The router resolved — it just couldn't find the procedure.
		expect(body.code).toBe("NOT_FOUND");
	});

	it("empty `app.origins` makes the worker throw at construction", async () => {
		// `app.origins: []` means "no allowed origins" — a misconfiguration
		// that would silently break browsers. createWorker throws when it
		// sees the resulting `cors: []`; the emitted worker must surface
		// that at module-init time, not at first request.
		const outcome = await emitWorker({
			label: "cors-empty",
			origins: [],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "rt-empty" }),
				api(),
			],
			seed: {
				"src/schema/index.ts": "export const tables = {};\n",
			},
		});

		const evaluated = outcome.evaluate();
		expect(evaluated.ok).toBe(false);
		if (!evaluated.ok) {
			expect(evaluated.error).toMatch(/cors was provided but is empty/);
		}
	});
});

describe("emitted worker with auth boots (no bindings)", () => {
	beforeAll(() => {
		if (!existsSync(WORKSPACE)) setupWorkspace();
	});

	it("module evaluation succeeds end-to-end on authRuntime + callbacks wiring", async () => {
		// The guarantee we're chasing: the module loads. A missing
		// callbacks import, a broken `.use(authRuntime({...}))` chain, or
		// a misspelled runtime identifier would all fail at module-init
		// time. We don't hit an auth-protected route — that requires real
		// D1/KV bindings we don't have here.
		const outcome = await emitWorker({
			label: "auth-import",
			origins: ["https://example.com", "https://app.example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "rt-auth" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
			],
			seed: {
				"src/schema/index.ts": "export const tables = {};\n",
				"src/worker/plugins/auth.ts": `import { auth } from "@fcalell/plugin-auth";
export default auth.defineCallbacks({});
`,
			},
		});

		const evaluated = outcome.evaluate();
		expect(evaluated.ok, (evaluated as { error?: string }).error).toBe(true);

		// Structural sanity on the emitted source now that we know it imports.
		expect(outcome.workerSource).toContain("authRuntime");
		expect(outcome.workerSource).toContain("authCallbacks");
	});
});
