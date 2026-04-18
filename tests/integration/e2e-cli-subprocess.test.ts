import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Root of the workspace, used to locate the CLI entrypoint and the integration
// tests' `node_modules` (where `@fcalell/plugin-*` are linked). The temp dirs
// live as siblings of this test file so Node's resolution walks up into
// `tests/integration/node_modules/` via the linked tree.
const INTEGRATION_ROOT = resolve(import.meta.dirname);
const REPO_ROOT = resolve(INTEGRATION_ROOT, "../..");
const CLI_ENTRY = resolve(REPO_ROOT, "packages/cli/src/cli.ts");
const NODE_MODULES = resolve(INTEGRATION_ROOT, "node_modules");
// Resolve tsx's cli script directly. Going through `npx` would shell out,
// which is slower and flakier, and spawning plain `tsx` depends on PATH.
const TSX_CLI = resolve(
	REPO_ROOT,
	"node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs",
);

function makeTempDir(suffix: string): string {
	// Deterministic name + timestamp keeps parallel vitest workers from
	// colliding without relying on `mkdtemp` (which would land under
	// `os.tmpdir()` — outside the integration tree — and break plugin
	// resolution).
	const dir = resolve(
		INTEGRATION_ROOT,
		`.tmp-e2e-${suffix}-${process.pid}-${Date.now()}`,
	);
	mkdirSync(dir, { recursive: true });
	// Link the integration project's node_modules into the tmp dir so the
	// spawned CLI can resolve `@fcalell/plugin-*` without a `pnpm install`.
	symlinkSync(NODE_MODULES, resolve(dir, "node_modules"), "dir");
	return dir;
}

interface CliResult {
	status: number | null;
	stdout: string;
	stderr: string;
}

function runCli(cwd: string, args: string[]): CliResult {
	const result = spawnSync(process.execPath, [TSX_CLI, CLI_ENTRY, ...args], {
		cwd,
		encoding: "utf8",
		stdio: "pipe",
		// Clear CI/TTY signals so the CLI picks the scripted path even when
		// the parent vitest run is interactive.
		env: { ...process.env, CI: "true" },
	});
	return {
		status: result.status,
		stdout: String(result.stdout ?? ""),
		stderr: String(result.stderr ?? ""),
	};
}

describe("stack CLI subprocess e2e", () => {
	let dir: string;

	beforeAll(() => {
		dir = makeTempDir("init");
	});

	afterAll(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("stack init --yes --plugins=db,api,solid scaffolds a consumer project", {
		timeout: 30000,
	}, () => {
		const result = runCli(dir, [
			"init",
			".",
			"--plugins=db,api,solid",
			"--domain=example.com",
			"--yes",
		]);

		expect(result.status, result.stderr + result.stdout).toBe(0);

		// Base scaffolded files
		expect(existsSync(resolve(dir, "package.json"))).toBe(true);
		expect(existsSync(resolve(dir, "tsconfig.json"))).toBe(true);
		expect(existsSync(resolve(dir, "stack.config.ts"))).toBe(true);
		expect(existsSync(resolve(dir, "biome.json"))).toBe(true);

		// Plugin-contributed files (Tier B business logic only; Tier A hidden
		// wiring files like entry.tsx / _layout.tsx / index.html / wrangler.toml
		// are no longer scaffolded into src/ — they regenerate into .stack/**).
		expect(existsSync(resolve(dir, "src/schema/index.ts"))).toBe(true);
		expect(existsSync(resolve(dir, "src/app/pages/index.tsx"))).toBe(true);
		expect(existsSync(resolve(dir, "src/app/pages/_layout.tsx"))).toBe(false);
		expect(existsSync(resolve(dir, "wrangler.toml"))).toBe(false);

		// Generated .stack dir (init calls generate as its final step)
		expect(existsSync(resolve(dir, ".stack"))).toBe(true);
		expect(existsSync(resolve(dir, ".stack/env.d.ts"))).toBe(true);

		// Config imports the plugins we asked for
		const cfg = readFileSync(resolve(dir, "stack.config.ts"), "utf-8");
		expect(cfg).toContain('from "@fcalell/plugin-db"');
		expect(cfg).toContain('from "@fcalell/plugin-api"');
		expect(cfg).toContain('from "@fcalell/plugin-solid"');
		expect(cfg).toContain('domain: "example.com"');
		expect(cfg).toMatch(/app:\s*\{/);
	});

	it("stack generate produces .stack/worker.ts and .stack/wrangler.toml", {
		timeout: 30000,
	}, () => {
		const result = runCli(dir, ["generate"]);
		expect(result.status, result.stderr + result.stdout).toBe(0);

		const workerPath = resolve(dir, ".stack/worker.ts");
		const wranglerPath = resolve(dir, ".stack/wrangler.toml");

		expect(existsSync(workerPath)).toBe(true);
		expect(existsSync(wranglerPath)).toBe(true);

		const worker = readFileSync(workerPath, "utf-8");
		expect(worker).toContain("@fcalell/plugin-api/runtime");
		expect(worker).toContain("@fcalell/plugin-db/runtime");
		expect(worker).toContain("export default worker");

		const wrangler = readFileSync(wranglerPath, "utf-8");
		// `main` is relative to the wrangler.toml path; the generated file lives
		// in .stack/ so "worker.ts" resolves to .stack/worker.ts. Consumers can
		// override by providing their own wrangler.toml with a custom `main`.
		expect(wrangler).toContain('main = "worker.ts"');
		expect(wrangler).toContain("[[d1_databases]]");
		expect(wrangler).toContain("DB_MAIN");
	});

	it("stack remove db drops db() from the config and regenerates without D1", {
		timeout: 30000,
	}, () => {
		const removeResult = runCli(dir, ["remove", "db"]);
		expect(removeResult.status, removeResult.stderr + removeResult.stdout).toBe(
			0,
		);

		// `stack remove` edits stack.config.ts and then calls generate in-
		// process, but Node's ESM import cache serves the pre-edit config —
		// so re-run generate as a fresh subprocess to flush the state.
		const regenerate = runCli(dir, ["generate"]);
		expect(regenerate.status, regenerate.stderr + regenerate.stdout).toBe(0);

		// `stack remove` removes the `db()` call from the plugins array but
		// preserves the import line (left for the consumer to clean up if
		// they want). We only care that the plugin is no longer active.
		const cfg = readFileSync(resolve(dir, "stack.config.ts"), "utf-8");
		expect(cfg).not.toMatch(/plugins:\s*\[[^\]]*\bdb\(/);

		const wranglerPath = resolve(dir, ".stack/wrangler.toml");
		expect(existsSync(wranglerPath)).toBe(true);
		const wrangler = readFileSync(wranglerPath, "utf-8");
		expect(wrangler).not.toContain("[[d1_databases]]");
		expect(wrangler).not.toContain("DB_MAIN");
	});
});

// Safety net: make sure the prerequisites exist. Failing early with a clear
// message beats a cascade of spawn errors.
if (!existsSync(CLI_ENTRY)) {
	throw new Error(`CLI entrypoint not found at ${CLI_ENTRY}`);
}
if (!existsSync(TSX_CLI)) {
	throw new Error(
		`tsx binary not found at ${TSX_CLI}. Run pnpm install at the repo root.`,
	);
}
if (!existsSync(dirname(TSX_CLI))) {
	throw new Error(`tsx package dir missing: ${dirname(TSX_CLI)}`);
}
if (!existsSync(NODE_MODULES)) {
	throw new Error(
		`Integration tests node_modules missing at ${NODE_MODULES}. Run pnpm install.`,
	);
}
