import assert from "node:assert/strict";
import { test } from "node:test";
import type { ViteConfigValues } from "../src/node/index.ts";
import { renderViteConfig } from "../src/node/index.ts";

const values: ViteConfigValues = {
	configImports: [{ source: "@vitejs/plugin-react", default: "react" }],
	pluginCalls: [
		{ kind: "call", callee: { kind: "identifier", name: "react" }, args: [] },
	],
	resolveAliases: [],
	resolveDedupe: ["react"],
	devServerPort: 3000,
	outDir: "dist/client",
	serverProxy: [],
	fsAllow: [],
	watchIgnored: [],
	clientHeaders: { "X-Frame-Options": "DENY" },
};

test("the slot values render as one Vite config", () => {
	const config = renderViteConfig(values);
	assert.match(config, /import react from "@vitejs\/plugin-react";/);
	assert.match(config, /plugins: \[react\(\)\]/);
	assert.match(config, /outDir: "\.\.\/dist\/client"/);
	assert.match(config, /port: 3000/);
	assert.match(config, /dedupe: \["react"\]/);
});

test("imports merge by source: a contribution's repeat of a renderer import is one binding", () => {
	const config = renderViteConfig({
		...values,
		fsAllow: [{ kind: "identifier", name: "x" }],
		configImports: [
			{ source: "node:url", named: ["fileURLToPath"] },
			{ source: "vite", named: ["defineConfig", "loadEnv"] },
			{ source: "pkg", default: "a" },
			{ source: "pkg", default: "a" },
			{ source: "pkg", named: ["one"] },
			{ source: "pkg", named: ["one", "two"] },
		],
	});
	assert.equal(config.match(/fileURLToPath/g)?.length, 2, config);
	assert.equal(config.match(/from "node:url"/g)?.length, 1, config);
	assert.match(
		config,
		/import \{ defineConfig, searchForWorkspaceRoot, loadEnv \} from "vite";/,
	);
	assert.match(config, /import a from "pkg";/);
	assert.match(config, /import \{ one, two \} from "pkg";/);
});

test("the renderer imports searchForWorkspaceRoot only when fsAllow has entries", () => {
	assert.doesNotMatch(renderViteConfig(values), /searchForWorkspaceRoot/);
});

test("two default names for one source is a contract error", () => {
	assert.throws(
		() =>
			renderViteConfig({
				...values,
				configImports: [
					{ source: "pkg", default: "a" },
					{ source: "pkg", default: "b" },
				],
			}),
		/conflicting default imports for "pkg"/,
	);
});
