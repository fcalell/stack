import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { plugin } from "@fcalell/cli";
import { renderTsSourceFile } from "@fcalell/cli/ast";
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

test("the vite config runs the router plugin before React", async () => {
	const config = (await artifacts()).get(".stack/vite.config.ts") ?? "";
	const router = config.indexOf("tanstackRouter({");
	const compiler = config.indexOf("react({");
	assert.ok(router > 0 && compiler > router, config);
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
		/const router = createRouter\(\{ routeTree, defaultPreloadStaleTime: 0 \}\);\nbindOther\(router\);\nbindB\(router\);\n\ncreateRoot/,
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

test("a logo rides the icon slot as a string or a pair, leaves the favicon alone, and is absent without one", async () => {
	const one = await graph({ icon: "/mark.svg", logo: "/logo.svg" }).resolve(
		react.slots.icon,
	);
	assert.deepEqual(one, { light: "/mark.svg", logo: { light: "/logo.svg" } });
	const logo = { light: "/logo.svg", dark: "/logo-dark.svg" };
	const pair = { icon: { light: "/a.svg", dark: "/b.svg" }, logo };
	assert.deepEqual(await graph(pair).resolve(react.slots.icon), {
		light: "/a.svg",
		dark: "/b.svg",
		logo,
	});
	const html = (await artifacts(pair)).get(".stack/index.html") ?? "";
	assert.doesNotMatch(html, /logo/);
	assert.deepEqual(
		await graph({ icon: "/mark.svg" }).resolve(react.slots.icon),
		{
			light: "/mark.svg",
		},
	);
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

// The options the generated `react(...)` call receives, evaluated.
async function reactCall(): Promise<{
	exclude: RegExp;
	babel: {
		plugins: [[string, { sources: (filename: string) => boolean }]];
	};
}> {
	const calls = await graph().resolve(vite.slots.pluginCalls);
	const call = calls.find(
		(c) =>
			c.kind === "call" &&
			c.callee.kind === "identifier" &&
			c.callee.name === "react",
	);
	assert.ok(call);
	const source = renderTsSourceFile({
		imports: [],
		statements: [{ kind: "const", name: "options", value: call }],
	});
	return new Function("react", `${source}\nreturn options;`)((o: unknown) => o);
}

const PNPM_FCALELL =
	"/app/node_modules/.pnpm/@fcalell+plugin-react-ui@github.com+x/node_modules/@fcalell/plugin-react-ui/src/ui/button.tsx";

test("the React Compiler reaches stack's packages under node_modules and no other dependency", async () => {
	const { exclude, babel } = await reactCall();
	const [[name, { sources }]] = babel.plugins;
	assert.equal(name, "babel-plugin-react-compiler");
	const cases: Array<[string, boolean]> = [
		["/app/src/routes/index.tsx", true],
		[PNPM_FCALELL, true],
		["/app/node_modules/@fcalell/ui-core/src/cn.ts", true],
		["/app/node_modules/.pnpm/zod@4.0.0/node_modules/zod/index.js", false],
		["/app/node_modules/react/index.js", false],
		[
			"/app/node_modules/.pnpm/@fcalell+x@1/node_modules/@fcalell/x/node_modules/zod/index.js",
			false,
		],
	];
	for (const [file, compiled] of cases) {
		// Babel runs on what `exclude` leaves in, the compiler on what `sources` keeps.
		assert.equal(!exclude.test(file), compiled, `exclude: ${file}`);
		assert.equal(sources(file), compiled, `sources: ${file}`);
	}
});
