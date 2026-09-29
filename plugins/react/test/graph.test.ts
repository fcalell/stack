import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { vite } from "@fcalell/plugin-vite";
import { type ReactOptions, react } from "../src/index.ts";

// The graph `stack generate` resolves for vite + react.
function graph(options: ReactOptions = {}) {
	const cwd = mkdtempSync(join(tmpdir(), "stack-react-"));
	const plugins = [
		{ factory: vite, config: vite() },
		{ factory: react, config: react(options) },
	];
	const discovered = plugins.map(
		({ factory, config }) =>
			({
				name: config.__plugin,
				cli: factory.cli,
				factory,
				options: config.options,
			}) as unknown as DiscoveredPlugin,
	);
	return buildGraphFromDiscovered({
		discovered,
		app: { name: "shop", domain: "example.com" },
		cwd,
	}).graph;
}

async function artifacts(
	options: ReactOptions = {},
): Promise<Map<string, string>> {
	const files = await graph(options).resolve(cliSlots.artifactFiles);
	return new Map(files.map((f) => [f.path, f.content]));
}

test("the vite config runs the router plugin before React, with the compiler on", async () => {
	const config = (await artifacts()).get(".stack/vite.config.ts") ?? "";
	assert.match(config, /import react from "@vitejs\/plugin-react";/);
	assert.match(
		config,
		/import \{ tanstackRouter \} from "@tanstack\/router-plugin\/vite";/,
	);
	const router = config.indexOf("tanstackRouter({");
	const compiler = config.indexOf("react({");
	assert.ok(router > 0 && compiler > router, config);
	assert.match(config, /routesDirectory: "\.\.\/src\/app\/routes"/);
	assert.match(config, /generatedRouteTree: "\.\/routeTree\.gen\.ts"/);
	assert.match(config, /autoCodeSplitting: true/);
	assert.match(config, /\["babel-plugin-react-compiler", \{\}\]/);
	assert.match(config, /dedupe: \["react", "react-dom"\]/);
});

test("the entry mounts the router inside the providers under StrictMode", async () => {
	const files = await artifacts();
	const entry = files.get(".stack/entry.tsx") ?? "";
	assert.match(
		entry,
		/import \{ createRouter, RouterProvider \} from "@tanstack\/react-router";/,
	);
	assert.match(entry, /import \{ routeTree \} from "\.\/routeTree\.gen\.ts";/);
	assert.match(entry, /const router = createRouter\(\{ routeTree \}\);/);
	assert.match(
		entry,
		/<StrictMode>\s*<Providers>\s*<RouterProvider router=\{router\} \/>\s*<\/Providers>\s*<\/StrictMode>/,
	);
	assert.match(
		files.get(".stack/routes.d.ts") ?? "",
		/interface Register \{\n\t\trouter: ReturnType<typeof createRouter<typeof routeTree>>;/,
	);
	assert.match(
		files.get(".stack/index.html") ?? "",
		/<script src="\/entry\.tsx" type="module"><\/script>/,
	);
});

test("the head carries the app's name and the metadata options", async () => {
	const html =
		(
			await artifacts({
				lang: "es",
				description: "A shop",
				themeColor: "#000000",
				icon: "/icon.svg",
			})
		).get(".stack/index.html") ?? "";
	assert.match(html, /<html lang="es">/);
	assert.match(html, /<title>shop<\/title>/);
	assert.match(html, /<meta name="description" content="A shop"/);
	assert.match(html, /<meta name="theme-color" content="#000000"/);
	assert.match(html, /<link rel="icon" href="\/icon\.svg"/);
});

test("a custom routes directory reaches the router plugin and the scaffolds", async () => {
	const g = graph({ routes: { dir: "src/pages" } });
	const files = await g.resolve(cliSlots.artifactFiles);
	const config = files.find((f) => f.path === ".stack/vite.config.ts");
	assert.match(config?.content ?? "", /routesDirectory: "\.\.\/src\/pages"/);
	const targets = (await g.resolve(cliSlots.initScaffolds)).map(
		(s) => s.target,
	);
	assert.deepEqual(targets.sort(), [
		"src/pages/__root.tsx",
		"src/pages/index.tsx",
	]);
});

test("routing off drops the router, the mount and the route scaffolds", async () => {
	const g = graph({ routes: false });
	const files = new Map(
		(await g.resolve(cliSlots.artifactFiles)).map((f) => [f.path, f.content]),
	);
	assert.doesNotMatch(
		files.get(".stack/vite.config.ts") ?? "",
		/tanstackRouter/,
	);
	assert.match(files.get(".stack/vite.config.ts") ?? "", /react\(\{/);
	assert.equal(files.has(".stack/entry.tsx"), false);
	assert.equal(files.has(".stack/routes.d.ts"), false);
	assert.doesNotMatch(files.get(".stack/index.html") ?? "", /entry\.tsx/);
	assert.deepEqual(await g.resolve(cliSlots.initScaffolds), []);
	assert.deepEqual(await g.resolve(react.slots.topLevelRoutes), []);
	assert.deepEqual(await g.resolve(cliSlots.postWrite), []);
});
