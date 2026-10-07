import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { plugin } from "@fcalell/cli";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { react } from "@fcalell/plugin-react";
import { vite } from "@fcalell/plugin-vite";
import { screens } from "../src/index.ts";

// A peer the way react-ui contributes to the entry: a stylesheet, and the
// function the entry calls with its router.
const peer = plugin("peer", {
	label: "Peer",
	contributes: [
		react.slots.entryImports.contribute(() => ({
			source: "./app.css",
			sideEffect: true,
		})),
		react.slots.routerBindings.contribute(() => ({
			source: "@acme/ui/navigate",
			named: ["bindRouter"],
		})),
		screens.slots.handlerModules.contribute(() => "@acme/auth/screens"),
		screens.slots.previewGlobals.contribute(() => ({
			name: "density",
			title: "Density",
			values: ["desktop", "touch"],
			default: "desktop",
			apply: { attribute: "data-density" },
		})),
	],
});

function artifacts(routes?: { dir: string } | false) {
	const cwd = mkdtempSync(join(tmpdir(), "stack-screens-"));
	const configs = [
		{ factory: vite, config: vite() },
		{ factory: react, config: react({ routes }) },
		{ factory: api, config: api() },
		{ factory: screens, config: screens() },
		{ factory: peer, config: peer() },
	];
	const discovered = configs.map(
		({ factory, config }) =>
			({
				name: config.__plugin,
				cli: factory.cli,
				factory,
				options: config.options,
			}) as unknown as DiscoveredPlugin,
	);
	const { graph } = buildGraphFromDiscovered({
		discovered,
		app: { name: "shop", domain: "example.com" },
		cwd,
	});
	return graph
		.resolve(cliSlots.artifactFiles)
		.then((files) => new Map(files.map((f) => [f.path, f.content])));
}

test("the host config renders from the app's own slot values, with its adaptations", async () => {
	const files = await artifacts();
	const app = files.get(".stack/vite.config.ts") ?? "";
	const host = files.get(".stack/screens.vite.config.ts") ?? "";

	// What the app's config holds, the host's holds too.
	assert.match(host, /tanstackRouter\(\{/);
	assert.match(host, /providersPlugin\(\)/);
	assert.match(host, /dedupe: \["react", "react-dom"\]/);

	// No frame-blocking headers and no proxy or port: the host serves Vite itself.
	assert.match(app, /X-Frame-Options/);
	assert.doesNotMatch(host, /X-Frame-Options|frame-ancestors/);
	assert.doesNotMatch(host, /port:|proxy:/);

	// The host-only plugin is the host's alone.
	assert.match(
		host,
		/import \{ screensPlugin \} from "@fcalell\/plugin-screens\/vite";/,
	);
	assert.doesNotMatch(app, /screensPlugin/);
});

test("the screens plugin carries the entry's stylesheet, router bindings, prefixes and handler modules", async () => {
	const host = (await artifacts()).get(".stack/screens.vite.config.ts") ?? "";
	assert.match(host, /fixtures: "\.\.\/src\/app\/fixtures\.ts"/);
	assert.match(host, /routesDir: "\.\.\/src\/app\/routes"/);
	assert.match(host, /entryImports: \["\.\/app\.css"\]/);
	assert.match(
		host,
		/routerBindings: \[\{ source: "@acme\/ui\/navigate", name: "bindRouter" \}\]/,
	);
	assert.match(host, /prefixes: \["\/rpc"\]/);
	assert.match(host, /handlerModules: \["@acme\/auth\/screens"\]/);
	assert.match(
		host,
		/previewGlobals: \[\{ name: "density", title: "Density", values: \["desktop", "touch"\], default: "desktop", apply: \{ attribute: "data-density" \} \}\]/,
	);
});

test("a moved routes directory reaches the host config and Storybook's main", async () => {
	const files = await artifacts({ dir: "src/pages" });
	assert.match(
		files.get(".stack/screens.vite.config.ts") ?? "",
		/routesDir: "\.\.\/src\/pages"/,
	);
	assert.match(
		files.get(".stack/screens/main.ts") ?? "",
		/screensMain\(\{ routesDir: "src\/pages" \}\)/,
	);
});

test("without routes there are no screens to host", async () => {
	const files = await artifacts(false);
	assert.equal(files.has(".stack/screens.vite.config.ts"), false);
	assert.equal(files.has(".stack/screens/main.ts"), false);
});

test("the app's config runs the router plugin and the host's runs it first, once", async () => {
	const files = await artifacts();
	const app = files.get(".stack/vite.config.ts") ?? "";
	const host = files.get(".stack/screens.vite.config.ts") ?? "";
	for (const config of [app, host]) {
		assert.match(
			config,
			/import \{ tanstackRouter \} from "@tanstack\/router-plugin\/vite";/,
		);
		assert.equal(config.match(/tanstackRouter\(\{/g)?.length, 1, config);
		assert.ok(
			config.indexOf("tanstackRouter({") < config.indexOf("react({"),
			config,
		);
	}
});

test("no config file is generated for a Storybook that draws components", async () => {
	const files = await artifacts();
	assert.equal(files.has(".stack/storybook.vite.config.ts"), false);
});
