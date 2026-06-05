import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { defineConfig, type PluginConfig } from "@fcalell/cli";
import { runStackGenerate } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { solid } from "@fcalell/plugin-solid";
import { solidUi } from "@fcalell/plugin-solid-ui";
import { vite } from "@fcalell/plugin-vite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// End-to-end generate pipeline snapshot. Drives the real `stack generate`
// code path via `runStackGenerate` — no hand-ordered plugin arrays, no
// synthetic event payloads. Each derivation feeds through discovery →
// buildGraph → resolve(cliSlots.artifactFiles).

function seedFs(cwd: string, files: string[]): void {
	for (const file of files) {
		const abs = join(cwd, file);
		mkdirSync(dirname(abs), { recursive: true });
		if (file.endsWith("/")) {
			mkdirSync(abs, { recursive: true });
		} else {
			writeFileSync(abs, "");
		}
	}
}

interface GenerateSnapshot {
	files: Array<{ path: string; content: string }>;
	worker: string | null;
	wrangler: string | null;
	viteConfig: string | null;
	providers: string | null;
	entry: string | null;
	html: string | null;
	appCss: string | null;
}

async function runGenerate(opts: {
	cwd: string;
	plugins: readonly PluginConfig[];
	origins?: string[];
}): Promise<GenerateSnapshot> {
	const result = await runStackGenerate({
		config: defineConfig({
			app: {
				name: "test-app",
				domain: "example.com",
				origins: opts.origins,
			},
			plugins: opts.plugins,
		}),
		cwd: opts.cwd,
	});

	const files = result.files;
	const takeFile = (path: string): string | null =>
		files.find((f) => f.path === path)?.content ?? null;

	const worker = takeFile(".stack/worker.ts");
	const wrangler = takeFile(".stack/wrangler.toml");
	const viteConfig = takeFile(".stack/vite.config.ts");
	const providers = takeFile(".stack/virtual-providers.tsx");
	const entry = takeFile(".stack/entry.tsx");
	const html = takeFile(".stack/index.html");
	const appCss = takeFile(".stack/app.css");

	const generatedFilePaths = new Set([
		".stack/worker.ts",
		".stack/virtual-providers.tsx",
		".stack/entry.tsx",
		".stack/index.html",
		".stack/routes.d.ts",
		".stack/app.css",
		".stack/vite.config.ts",
		".stack/wrangler.toml",
		".dev.vars",
	]);
	const remainingFiles = files.filter((f) => !generatedFilePaths.has(f.path));

	return {
		files: remainingFiles.map((f) => ({ path: f.path, content: f.content })),
		worker,
		wrangler,
		viteConfig,
		providers,
		entry,
		html,
		appCss,
	};
}

describe("generate pipeline snapshot", () => {
	// plugin-cloudflare now pins compatibility_date to a plugin-shipped
	// constant, so there's no clock to freeze — snapshots are stable
	// across days by construction. See plugins/cloudflare/src/types.ts.

	let cwd: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-generate-snap-"));
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	it("full-stack: db + auth + api + vite + solid + solid-ui", async () => {
		seedFs(cwd, [
			"src/schema/",
			"src/worker/plugins/auth.ts",
			"src/worker/middleware.ts",
			"src/worker/routes/users.ts",
		]);

		const snapshot = await runGenerate({
			cwd,
			origins: [
				"https://example.com",
				"https://app.example.com",
				"http://localhost:3000",
			],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "abc-123" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
				vite({ port: 3000 }),
				solid({ routes: false }),
				solidUi(),
			],
		});
		expect(snapshot).toMatchSnapshot();
	});

	it("db + api (no auth, no frontend): schema tooling + minimal worker", async () => {
		seedFs(cwd, ["src/schema/", "src/worker/routes/users.ts"]);
		const snapshot = await runGenerate({
			cwd,
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "abc-123" }),
				api(),
			],
		});
		expect(snapshot).toMatchSnapshot();
	});

	it("api-only: worker without frontend", async () => {
		seedFs(cwd, ["src/schema/", "src/worker/routes/users.ts"]);
		const snapshot = await runGenerate({
			cwd,
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "abc-123" }),
				api(),
			],
		});
		expect(snapshot).toMatchSnapshot();
	});

	it("frontend-only: vite + solid without worker", async () => {
		const snapshot = await runGenerate({
			cwd,
			plugins: [vite({ port: 3000 }), solid({ routes: false })],
		});
		expect(snapshot).toMatchSnapshot();
	});

	it("frontend-only: vite + solid + solid-ui without worker", async () => {
		// Validates solid-ui slotting into solid without any worker plugins —
		// app.css should aggregate Tailwind + plugin-solid-ui globals, and
		// virtual-providers.tsx should pick up MetaProvider + Toaster.
		const snapshot = await runGenerate({
			cwd,
			plugins: [vite({ port: 3000 }), solid({ routes: false }), solidUi()],
		});
		expect(snapshot).toMatchSnapshot();
	});

	it("worker-only with auth: no frontend, APP_URL fallback, derived CORS", async () => {
		// No vite/solid plugins — no localhost origin contributed — so
		// `app.domain` seeds CORS to [https://example.com, https://app.example.com].
		// APP_URL has no frontend-derived default, so it stays an empty-string
		// var (consumer fills it via `.dev.vars`).
		seedFs(cwd, [
			"src/schema/",
			"src/worker/plugins/auth.ts",
			"src/worker/routes/users.ts",
		]);
		const snapshot = await runGenerate({
			cwd,
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "abc-123" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
			],
		});
		expect(snapshot).toMatchSnapshot();
	});

	it("auth with localhost in app.origins: sameSite=none end-to-end", async () => {
		// When app.origins explicitly includes a localhost origin (without vite
		// present), the auth runtimeOptions derivation must still pick up
		// sameSite: "none" from the cors list. Proves the localhost signal is
		// read from the CORS list, not from a plugin-identity check.
		seedFs(cwd, [
			"src/schema/",
			"src/worker/plugins/auth.ts",
			"src/worker/routes/users.ts",
		]);
		const snapshot = await runGenerate({
			cwd,
			origins: ["https://example.com", "http://localhost:5173"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "abc-123" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
			],
		});
		expect(snapshot).toMatchSnapshot();
	});

	it("full-stack with explicit app.origins drives auth sameSite=none end-to-end", async () => {
		// Coverage gap requested: app.origins explicitly carries a localhost
		// origin in a real full-stack app (vite + solid + solid-ui present
		// AND a worker stack). Distinct from the worker-only fixture above
		// because here the localhost contribution from vite would normally
		// land on its own — proving the explicit origins list is used
		// verbatim and still flows into auth's sameSite derivation.
		seedFs(cwd, [
			"src/schema/",
			"src/worker/plugins/auth.ts",
			"src/worker/middleware.ts",
			"src/worker/routes/users.ts",
		]);
		const snapshot = await runGenerate({
			cwd,
			origins: ["https://example.com", "http://localhost:3000"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "abc-123" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
				vite({ port: 3000 }),
				solid({ routes: false }),
				solidUi(),
			],
		});
		expect(snapshot).toMatchSnapshot();
	});

	it("all-plugins with empty app.origins: auth refuses to generate", async () => {
		// `app.origins: []` is a deliberate misconfiguration — present (so the
		// derived `cors` slot uses it verbatim per the `!== undefined`
		// contract) but empty (so Better Auth would silently fail CSRF). The
		// auth runtimeOptions derivation throws at generate time rather than
		// emit an ambiguous worker. This locks in the contract described in
		// plugin-auth/src/index.ts (Bug #1: empty-CORS contract).
		seedFs(cwd, [
			"src/schema/",
			"src/worker/plugins/auth.ts",
			"src/worker/routes/users.ts",
		]);
		await expect(
			runGenerate({
				cwd,
				origins: [],
				plugins: [
					cloudflare(),
					db({ dialect: "d1", databaseId: "abc-123" }),
					auth({ secretVar: "AUTH_SECRET" }),
					api(),
					vite({ port: 3000 }),
					solid({ routes: false }),
					solidUi(),
				],
			}),
		).rejects.toThrow(/no trusted origins are available/);
	});

	it("worker-only with empty app.origins: api emits empty CORS, auth refuses", async () => {
		// Same misconfiguration on a worker-only stack. Verifies the empty
		// allow-list contract is uniform — auth's empty-CORS throw doesn't
		// depend on the presence/absence of vite.
		seedFs(cwd, [
			"src/schema/",
			"src/worker/plugins/auth.ts",
			"src/worker/routes/users.ts",
		]);
		await expect(
			runGenerate({
				cwd,
				origins: [],
				plugins: [
					cloudflare(),
					db({ dialect: "d1", databaseId: "abc-123" }),
					auth({ secretVar: "AUTH_SECRET" }),
					api(),
				],
			}),
		).rejects.toThrow(/no trusted origins are available/);
	});

	// Plugin-order invariance: the slot graph is order-independent. Shuffling
	// the plugin array must produce identical artifact output.
	it("produces identical output when plugin order is shuffled", async () => {
		seedFs(cwd, [
			"src/schema/",
			"src/worker/plugins/auth.ts",
			"src/worker/middleware.ts",
			"src/worker/routes/users.ts",
		]);

		const canonical = await runGenerate({
			cwd,
			origins: [
				"https://example.com",
				"https://app.example.com",
				"http://localhost:3000",
			],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "abc-123" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
				vite({ port: 3000 }),
				solid({ routes: false }),
				solidUi(),
			],
		});

		const shuffledCwd = mkdtempSync(
			join(tmpdir(), "stack-generate-snap-shuf-"),
		);
		seedFs(shuffledCwd, [
			"src/schema/",
			"src/worker/plugins/auth.ts",
			"src/worker/middleware.ts",
			"src/worker/routes/users.ts",
		]);
		try {
			const shuffled = await runGenerate({
				cwd: shuffledCwd,
				origins: [
					"https://example.com",
					"https://app.example.com",
					"http://localhost:3000",
				],
				plugins: [
					solidUi(),
					api(),
					vite({ port: 3000 }),
					auth({ secretVar: "AUTH_SECRET" }),
					db({ dialect: "d1", databaseId: "abc-123" }),
					cloudflare(),
					solid({ routes: false }),
				],
			});

			expect(shuffled).toEqual(canonical);
		} finally {
			rmSync(shuffledCwd, { recursive: true, force: true });
		}
	});
});
