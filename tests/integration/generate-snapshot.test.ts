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
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

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
	// plugin-cloudflare seeds compatibility_date with today's ISO date.
	// Freeze the clock so snapshots stay stable across days.
	beforeAll(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
	});

	afterAll(() => {
		vi.useRealTimers();
	});

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
			"src/worker/routes/",
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
		seedFs(cwd, ["src/schema/"]);
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
		seedFs(cwd, ["src/schema/", "src/worker/routes/"]);
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

	// Plugin-order invariance: the slot graph is order-independent. Shuffling
	// the plugin array must produce identical artifact output.
	it("produces identical output when plugin order is shuffled", async () => {
		seedFs(cwd, [
			"src/schema/",
			"src/worker/plugins/auth.ts",
			"src/worker/middleware.ts",
			"src/worker/routes/",
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
			"src/worker/routes/",
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
