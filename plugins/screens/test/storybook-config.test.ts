import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { defineConfig } from "@fcalell/cli";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { react } from "@fcalell/plugin-react";
import { vite } from "@fcalell/plugin-vite";
import { screens } from "../src/index.ts";
import { writeStorybookConfig } from "../src/node/index.ts";

const config = defineConfig({
	app: { name: "shop", domain: "example.com" },
	plugins: [vite(), react(), api(), screens(), cloudflare()],
});

test("the component host's config is the app's own without the router plugin", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "stack-roster-"));
	const path = await writeStorybookConfig({ config, cwd });
	assert.equal(path, join(cwd, ".stack/storybook.vite.config.ts"));
	const host = readFileSync(path, "utf8");

	// What the app's config runs, the host runs, bar the router plugin and its import.
	assert.doesNotMatch(host, /tanstackRouter/);
	assert.match(host, /react\(\{/);
	assert.match(host, /providersPlugin\(\)/);

	// The host's own plugin (the adaptations it shares with the screens host
	// are checked in graph.test.ts).
	assert.match(
		host,
		/import \{ storybookHost \} from "@fcalell\/plugin-screens\/vite";/,
	);
	assert.match(host, /storybookHost\(\)/);
	assert.doesNotMatch(host, /screensPlugin/);
});

test("the component host needs no routes", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "stack-roster-"));
	const noRoutes = defineConfig({
		app: { name: "shop", domain: "example.com" },
		plugins: [vite(), react({ routes: false }), api(), screens(), cloudflare()],
	});
	const host = readFileSync(
		await writeStorybookConfig({ config: noRoutes, cwd }),
		"utf8",
	);
	assert.match(host, /storybookHost\(\)/);
});
