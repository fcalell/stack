import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { defineConfig } from "@fcalell/cli";
import { runStackGenerate } from "@fcalell/cli/testing";
import { solid } from "@fcalell/plugin-solid";
import { solidUi } from "@fcalell/plugin-solid-ui";
import { vite } from "@fcalell/plugin-vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// End-to-end proof that a generated solid + solid-ui project actually
// builds — the three bugs this fixes (pagesDir resolved against the wrong
// root, a syntax error in the empty-routes fallback, and a font asset never
// emitted into the bundle) all only surface at real `vite build` time; unit
// tests on the individual functions can't catch the interaction. Mirrors
// node-server-runtime.test.ts's workspace/symlink pattern, but drives a real
// `vite build` subprocess against the generated config instead of hand-
// calling plugin hooks.

const INTEGRATION_ROOT = resolve(import.meta.dirname);
const REPO_ROOT = resolve(INTEGRATION_ROOT, "../..");
const NODE_MODULES = resolve(INTEGRATION_ROOT, "node_modules");
const WORKSPACE = resolve(INTEGRATION_ROOT, `.tmp-solid-build-${process.pid}`);
// Mirrors `plugins/vite`'s real `stack build` step: no --outDir flag; the
// generated config's `build.outDir: "../dist/client"` (relative to
// config.root = .stack) is the single source of truth, so output lands at
// the project root's dist/client where the node target serves it from.
const DIST_CLIENT = resolve(WORKSPACE, "dist/client");

const MARKER = "solid-build-marker";

let buildResult: SpawnSyncReturns<string>;

function extractFontPreloadHref(html: string): string | null {
	const linkTags = html.match(/<link[^>]*>/g) ?? [];
	for (const tag of linkTags) {
		if (!tag.includes('rel="preload"')) continue;
		if (!tag.includes("woff2")) continue;
		const hrefMatch = tag.match(/href="([^"]+)"/);
		if (hrefMatch?.[1]) return hrefMatch[1];
	}
	return null;
}

// Mirror tests/integration/node_modules into the fixture one entry at a time
// (rather than a single top-level symlink) so we can add one extra entry:
// `tailwindcss` is `solidUi()`'s own dependency, auto-wired into a REAL
// consumer's package.json by `cliSlots.initDeps` (plugin-authoring.md), but
// this fixture package's package.json is off-limits to edit here, so pnpm
// never links it under tests/integration/node_modules. Resolve the real
// package the same way a generated consumer's install would end up with it
// — via plugin-solid-ui's own dependency on it — and link it in.
function linkWorkspaceNodeModules(): void {
	const target = resolve(WORKSPACE, "node_modules");
	mkdirSync(target, { recursive: true });
	for (const entry of readdirSync(NODE_MODULES)) {
		symlinkSync(resolve(NODE_MODULES, entry), resolve(target, entry), "dir");
	}
	const solidUiRequire = createRequire(
		resolve(REPO_ROOT, "plugins/solid-ui/package.json"),
	);
	const tailwindcssDir = dirname(
		solidUiRequire.resolve("tailwindcss/package.json"),
	);
	symlinkSync(tailwindcssDir, resolve(target, "tailwindcss"), "dir");
}

beforeAll(async () => {
	rmSync(WORKSPACE, { recursive: true, force: true });
	mkdirSync(WORKSPACE, { recursive: true });
	linkWorkspaceNodeModules();
	// The generated vite.config.ts always sets `publicDir: "../public"` —
	// give it a real (empty) directory rather than relying on Vite's
	// missing-publicDir tolerance.
	mkdirSync(resolve(WORKSPACE, "public"), { recursive: true });

	const pageAbs = resolve(WORKSPACE, "src/app/pages/index.tsx");
	mkdirSync(resolve(pageAbs, ".."), { recursive: true });
	writeFileSync(
		pageAbs,
		`export default function Index() {\n\treturn <div>${MARKER}</div>;\n}\n`,
	);

	const config = defineConfig({
		app: { name: "solid-build-test", domain: "example.com" },
		plugins: [vite(), solid(), solidUi()],
	});
	const result = await runStackGenerate({ config, cwd: WORKSPACE });
	for (const file of result.files) {
		const abs = resolve(WORKSPACE, file.path);
		mkdirSync(resolve(abs, ".."), { recursive: true });
		writeFileSync(abs, file.content);
	}

	buildResult = spawnSync(
		resolve(NODE_MODULES, ".bin/vite"),
		["build", "--config", ".stack/vite.config.ts"],
		{
			cwd: WORKSPACE,
			encoding: "utf-8",
			timeout: 120_000,
		},
	);
}, 130_000);

afterAll(() => {
	rmSync(WORKSPACE, { recursive: true, force: true });
});

describe("solid + solid-ui: real `vite build` end-to-end", () => {
	it("exits 0", () => {
		expect(
			buildResult.status,
			`vite build failed.\nstdout:\n${buildResult.stdout}\nstderr:\n${buildResult.stderr}`,
		).toBe(0);
	});

	it("emits dist/client/index.html with a hashed (non-/@fs/) woff2 preload link", () => {
		const htmlPath = resolve(DIST_CLIENT, "index.html");
		expect(existsSync(htmlPath)).toBe(true);
		const html = readFileSync(htmlPath, "utf-8");
		const href = extractFontPreloadHref(html);
		expect(href).not.toBeNull();
		expect(href).not.toContain("/@fs/");
		expect(href).toMatch(/\.woff2$/);
	});

	it("compiles the seeded page into the bundle (route table was non-empty)", () => {
		const assetsDir = resolve(DIST_CLIENT, "assets");
		const files = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
		const hasMarker = files
			.filter((f) => f.endsWith(".js"))
			.some((f) =>
				readFileSync(resolve(assetsDir, f), "utf-8").includes(MARKER),
			);
		expect(hasMarker).toBe(true);
	});

	it("emits the woff2 asset file itself under dist/client", () => {
		const assetsDir = resolve(DIST_CLIENT, "assets");
		const files = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
		expect(files.some((f) => f.endsWith(".woff2"))).toBe(true);
	});
});
