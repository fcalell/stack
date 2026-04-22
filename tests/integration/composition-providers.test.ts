import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@fcalell/cli";
import { runStackGenerate } from "@fcalell/cli/testing";
import { solid } from "@fcalell/plugin-solid";
import { solidUi } from "@fcalell/plugin-solid-ui";
import { vite } from "@fcalell/plugin-vite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Drives the full generate pipeline and asserts on `.stack/virtual-providers.tsx`.
// Primary assertion is on the rendered JSX structure (imports + ordering of
// wraps + siblings).

describe("solid providers composition (solid + solid-ui)", () => {
	let cwd: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-providers-"));
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	it("full solid + solid-ui config emits .stack/virtual-providers.tsx wrapping children in MetaProvider with Toaster sibling", async () => {
		const result = await runStackGenerate({
			config: defineConfig({
				app: { name: "test-app", domain: "example.com" },
				plugins: [vite({ port: 3000 }), solid({ routes: false }), solidUi()],
			}),
			cwd,
		});

		const providers = result.files.find(
			(f) => f.path === ".stack/virtual-providers.tsx",
		)?.content;
		expect(providers).toBeDefined();
		if (!providers) return;

		expect(providers).toContain(
			'import { MetaProvider } from "@fcalell/plugin-solid-ui/meta"',
		);
		expect(providers).toContain(
			'import { Toaster } from "@fcalell/plugin-solid-ui/components/toast"',
		);
		expect(providers).toContain('import type { JSX } from "solid-js"');

		// Toaster is INSIDE MetaProvider (shares its context).
		expect(providers).toMatch(
			/<MetaProvider>[\s\S]*\{props\.children\}[\s\S]*<Toaster \/>[\s\S]*<\/MetaProvider>/,
		);
	});

	it("solid alone (no solid-ui) contributes no providers — virtual-providers.tsx is not emitted", async () => {
		const result = await runStackGenerate({
			config: defineConfig({
				app: { name: "test-app", domain: "example.com" },
				plugins: [vite({ port: 3000 }), solid({ routes: false })],
			}),
			cwd,
		});

		expect(
			result.files.find((f) => f.path === ".stack/virtual-providers.tsx"),
		).toBeUndefined();
	});

	it("plugin order invariance: solid-ui's provider contribution lands regardless of array order", async () => {
		const canonical = await runStackGenerate({
			config: defineConfig({
				app: { name: "test-app", domain: "example.com" },
				plugins: [vite({ port: 3000 }), solid({ routes: false }), solidUi()],
			}),
			cwd,
		});
		const canonicalProviders = canonical.files.find(
			(f) => f.path === ".stack/virtual-providers.tsx",
		)?.content;

		const shuffled = await runStackGenerate({
			config: defineConfig({
				app: { name: "test-app", domain: "example.com" },
				plugins: [solidUi(), solid({ routes: false }), vite({ port: 3000 })],
			}),
			cwd,
		});
		const shuffledProviders = shuffled.files.find(
			(f) => f.path === ".stack/virtual-providers.tsx",
		)?.content;

		expect(shuffledProviders).toEqual(canonicalProviders);
	});
});
