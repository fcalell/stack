import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { plugin } from "@fcalell/cli";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { vite } from "@fcalell/plugin-vite";
import { type ReactOptions, react } from "../src/index.ts";
import { routerPluginFor } from "../src/node/codegen.ts";

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
	assert.match(
		config,
		/routesDirectory: fileURLToPath\(new URL\("\.\.\/src\/app\/routes", import\.meta\.url\)\)/,
	);
	assert.match(
		config,
		/generatedRouteTree: fileURLToPath\(new URL\("\.\/routeTree\.gen\.ts", import\.meta\.url\)\)/,
	);
	assert.equal(config.match(/from "node:url"/g)?.length, 1, config);
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

// A peer that needs the router instance, as react-ui does.
const needsRouter = plugin("needs-router", {
	label: "Needs router",
	contributes: [
		react.slots.routerBindings.contribute(() => ({
			source: "peer/b",
			named: ["bindB"],
		})),
		react.slots.routerBindings.contribute(() => ({
			source: "peer/a",
			named: [{ name: "bindA", alias: "bindOther" }],
		})),
	],
});

test("a peer's router binding is imported and called with the router, by source, before render", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "stack-react-"));
	const discovered = [
		{ factory: vite, config: vite() },
		{ factory: react, config: react() },
		{ factory: needsRouter, config: needsRouter() },
	].map(
		({ factory, config }) =>
			({
				name: config.__plugin,
				cli: factory.cli,
				factory,
				options: config.options,
			}) as unknown as DiscoveredPlugin,
	);
	const { graph: peered } = buildGraphFromDiscovered({
		discovered,
		app: { name: "shop", domain: "example.com" },
		cwd,
	});
	const entry = (await peered.resolve(react.slots.entrySource)) ?? "";
	assert.match(entry, /import \{ bindB \} from "peer\/b";/);
	assert.match(entry, /import \{ bindA as bindOther \} from "peer\/a";/);
	assert.match(
		entry,
		/const router = createRouter\(\{ routeTree \}\);\nbindOther\(router\);\nbindB\(router\);\n\ncreateRoot/,
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

test("an app with no icon emits an icon link that requests nothing", async () => {
	const html = (await artifacts({})).get(".stack/index.html") ?? "";
	assert.match(html, /<link rel="icon" href="data:,"/);
});

test("an icon pair emits a link per colour scheme and the slot carries the pair", async () => {
	const icon = { light: "/mark.svg", dark: "/mark-dark.svg" };
	const html = (await artifacts({ icon })).get(".stack/index.html") ?? "";
	assert.match(
		html,
		/<link rel="icon" href="\/mark\.svg" media="\(prefers-color-scheme: light\)" type="image\/svg\+xml"/,
	);
	assert.match(
		html,
		/<link rel="icon" href="\/mark-dark\.svg" media="\(prefers-color-scheme: dark\)" type="image\/svg\+xml"/,
	);
	assert.deepEqual(await graph({ icon }).resolve(react.slots.icon), icon);
});

test("a single icon is the slot's light form and no icon is null", async () => {
	assert.deepEqual(
		await graph({ icon: "/icon.png" }).resolve(react.slots.icon),
		{
			light: "/icon.png",
		},
	);
	assert.equal(await graph({}).resolve(react.slots.icon), null);
});

test("a custom routes directory reaches the router plugin and the scaffolds", async () => {
	const g = graph({ routes: { dir: "src/pages" } });
	const files = await g.resolve(cliSlots.artifactFiles);
	const config = files.find((f) => f.path === ".stack/vite.config.ts");
	assert.match(
		config?.content ?? "",
		/routesDirectory: fileURLToPath\(new URL\("\.\.\/src\/pages", import\.meta\.url\)\)/,
	);
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

test("the router plugin is its own slot, held out of the calls every host reads", async () => {
	const g = graph();
	const router = await g.resolve(react.slots.routerPlugin);
	assert.ok(router);
	assert.deepEqual(
		router.imports.map((spec) => spec.source),
		["@tanstack/router-plugin/vite", "node:url"],
	);
	assert.equal(
		router.call.kind === "call" &&
			router.call.callee.kind === "identifier" &&
			router.call.callee.name,
		"tanstackRouter",
	);

	// `vite.slots.pluginCalls` is what a host that draws components renders:
	// React's plugin and no router. The app's config renders the router first.
	const calls = (await g.resolve(vite.slots.pluginCalls)).map((call) =>
		call.kind === "call" && call.callee.kind === "identifier"
			? call.callee.name
			: call.kind,
	);
	assert.ok(calls.includes("react"), calls.join());
	assert.ok(!calls.includes("tanstackRouter"), calls.join());
	assert.deepEqual(await g.resolve(vite.slots.appPlugins), [router]);
	const config = (await artifacts()).get(".stack/vite.config.ts") ?? "";
	assert.match(config, /plugins: \[tanstackRouter\(\{/);
});

test("the router plugin's options are data a host reruns the plugin on", async () => {
	const g = graph();
	const options = await g.resolve(react.slots.routerOptions);
	assert.ok(options);
	assert.equal(options.autoCodeSplitting, true);
	assert.deepEqual(
		await g.resolve(react.slots.routerPlugin),
		routerPluginFor(options),
	);
	const host = routerPluginFor({ ...options, autoCodeSplitting: false });
	assert.deepEqual(
		host.imports,
		(await g.resolve(react.slots.routerPlugin))?.imports,
	);
	assert.notDeepEqual(
		host.call,
		(await g.resolve(react.slots.routerPlugin))?.call,
	);
});

test("routing off leaves the router slot null and nothing for the app to add", async () => {
	const g = graph({ routes: false });
	assert.equal(await g.resolve(react.slots.routerOptions), null);
	assert.equal(await g.resolve(react.slots.routerPlugin), null);
	assert.deepEqual(await g.resolve(vite.slots.appPlugins), []);
});
