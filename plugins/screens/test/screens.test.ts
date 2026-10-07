import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { routeIndexer } from "../src/node/indexer.ts";
import {
	routeIdOf,
	routeOfModuleId,
	SCREEN_STATES,
	screenModule,
	screenModuleId,
	screenTitle,
} from "../src/node/screens.ts";
import { screensModule } from "../src/node/virtual.ts";
import { screensPlugin } from "../src/node/vite-plugin.ts";
import { routeUrl } from "../src/ui/route.ts";

test("a route file's id is the string its createFileRoute declares", () => {
	assert.equal(
		routeIdOf(`export const Route = createFileRoute("/projects/$id")({});`),
		"/projects/$id",
	);
	assert.equal(routeIdOf("createFileRoute('/')({})"), "/");
	assert.equal(routeIdOf("createFileRoute(\n\t`/a/b/`,\n)({})"), "/a/b/");
	// The root route, and a file the router ignores, declare none.
	assert.equal(routeIdOf("export const Route = createRootRoute({});"), null);
	assert.equal(routeIdOf("export const x = 1;"), null);
	// A lazy route shares the id of the route it completes: only one is a screen.
	assert.equal(routeIdOf('createLazyFileRoute("/projects")({})'), null);
});

test("a pathless layout is no screen, the routes it holds are", () => {
	assert.equal(routeIdOf('createFileRoute("/_app")({})'), null);
	assert.equal(routeIdOf('createFileRoute("/a/_layout")({})'), null);
	assert.equal(
		routeIdOf('createFileRoute("/_app/projects")({})'),
		"/_app/projects",
	);
	assert.equal(routeIdOf('createFileRoute("/_app/")({})'), "/_app/");
});

test("a route's title is its id, an index route named so", () => {
	assert.equal(screenTitle("/projects/$id"), "Screens/projects/$id");
	assert.equal(screenTitle("/projects"), "Screens/projects");
	assert.equal(screenTitle("/projects/"), "Screens/projects/index");
	assert.equal(screenTitle("/"), "Screens/index");
});

test("a segment that adds no URL is not in a route's title", () => {
	assert.equal(screenTitle("/_app/projects"), "Screens/projects");
	assert.equal(screenTitle("/_app/deploys/$id/"), "Screens/deploys/$id/index");
	assert.equal(screenTitle("/(auth)/sign-in"), "Screens/sign-in");
});

test("a route's module id round-trips through the virtual id", () => {
	for (const id of ["/", "/projects/$id", "/a/b/", "/_layout/x"]) {
		assert.equal(routeOfModuleId(screenModuleId(id)), id);
	}
	assert.equal(routeOfModuleId("virtual:stack-screens"), null);
	assert.equal(routeOfModuleId("/src/app/x.tsx"), null);
});

test("the module of a route exports the story the indexer lists, state by state", () => {
	const source = screenModule("/projects/$id");
	for (const { state, exportName, name } of SCREEN_STATES) {
		assert.ok(
			source.includes(
				`export const ${exportName} = screenStory("/projects/$id", "${state}", "${name}");`,
			),
			exportName,
		);
	}
	assert.match(source, /from "@fcalell\/plugin-screens\/stories"/);
});

test("the indexer lists five states of a route file and nothing of any other", async () => {
	const dir = mkdtempSync(join(tmpdir(), "stack-screens-"));
	const route = join(dir, "projects.$id.tsx");
	writeFileSync(route, 'createFileRoute("/projects/$id")({});');
	const other = join(dir, "helpers.ts");
	writeFileSync(other, "export const x = 1;");

	const entries = await routeIndexer.createIndex(route, {} as never);
	assert.deepEqual(
		entries.map((e) => [e.exportName, e.name]),
		SCREEN_STATES.map((s) => [s.exportName, s.name]),
	);
	for (const entry of entries) {
		assert.equal(entry.type, "story");
		assert.equal(entry.importPath, screenModuleId("/projects/$id"));
		assert.equal(entry.title, "Screens/projects/$id");
	}
	assert.deepEqual(await routeIndexer.createIndex(other, {} as never), []);
	assert.ok(routeIndexer.test.test(route));
});

test("a route is drawn at its full path with each param filled from the fixtures", () => {
	const params = { id: "p1", slug: "acme" };
	assert.equal(routeUrl("/projects", "/projects", params), "/projects");
	assert.equal(routeUrl("/p/$id", "/p/$id", params), "/p/p1");
	assert.equal(
		routeUrl("/o/$slug/p/$id", "/o/$slug/p/$id", params),
		"/o/acme/p/p1",
	);
	assert.equal(routeUrl("/f/{$id}.txt", "/f/{$id}.txt", params), "/f/p1.txt");
	assert.equal(routeUrl("/p/{-$id}", "/p/{-$id}", params), "/p/p1");
	assert.equal(routeUrl("/", "/", params), "/");
});

test("an optional param without an example is left out, a required one fails clearly", () => {
	assert.equal(routeUrl("/p/{-$id}/edit", "/p/{-$id}/edit", {}), "/p/edit");
	assert.throws(
		() => routeUrl("/projects/$id", "/projects/$id", {}),
		/no example value for the param "id" of the route \/projects\/\$id.*src\/app\/fixtures\.ts/,
	);
	assert.throws(
		() => routeUrl("/files/$", "/files/$", {}),
		/the param "_splat"/,
	);
	assert.equal(
		routeUrl("/files/$", "/files/$", { _splat: "a/b" }),
		"/files/a/b",
	);
});

const stackDir = mkdtempSync(join(tmpdir(), "stack-screens-"));
const options = {
	stackDir,
	fixtures: "../src/app/fixtures.ts",
	routesDir: "../src/app/routes",
	entryImports: ["./app.css", "some-package/style.css"],
	routerBindings: [{ source: "@acme/ui/navigate", name: "bindRouter" }],
	prefixes: ["/rpc", "/api/auth"],
	handlerModules: ["@acme/auth/screens"],
	previewGlobals: [
		{
			name: "mode",
			title: "Mode",
			values: ["light", "dark"],
			default: "light",
			apply: { classes: { dark: "dark" } },
		},
	],
};

test("the virtual module holds the entry's imports, the route tree, the prefixes and the handlers", () => {
	const source = screensModule(options);
	assert.ok(
		source.includes(`import ${JSON.stringify(join(stackDir, "app.css"))};`),
	);
	assert.ok(source.includes('import "some-package/style.css";'));
	assert.ok(
		source.includes('import { bindRouter as bind0 } from "@acme/ui/navigate";'),
	);
	assert.ok(source.includes('import handlers0 from "@acme/auth/screens";'));
	assert.ok(
		source.includes(
			`import { routeTree } from ${JSON.stringify(join(stackDir, "routeTree.gen.ts"))};`,
		),
	);
	assert.ok(source.includes('export const prefixes = ["/rpc","/api/auth"];'));
	assert.ok(source.includes("export const handlers = [...handlers0];"));
	assert.ok(
		source.includes(
			`export const previewGlobals = ${JSON.stringify(options.previewGlobals)};`,
		),
	);
	assert.ok(source.includes("bind0(router);"));
});

test("an app without a fixtures file draws every procedure as missing", () => {
	// No file at the conventional place: the module holds no fixtures, never a
	// failed import.
	const source = screensModule(options);
	assert.ok(source.includes("const fixtures = undefined;"));
	assert.ok(!source.includes("src/app/fixtures.ts"));
});

test("a fixtures file is imported once it exists", () => {
	const root = mkdtempSync(join(tmpdir(), "stack-screens-"));
	const stack = join(root, ".stack");
	const present = { ...options, stackDir: stack };
	assert.ok(screensModule(present).includes("const fixtures = undefined;"));
	mkdirSync(join(root, "src", "app"), { recursive: true });
	writeFileSync(join(root, "src", "app", "fixtures.ts"), "export default {};");
	assert.ok(
		screensModule(present).includes(
			`import fixtures from ${JSON.stringify(join(stack, "../src/app/fixtures.ts"))};`,
		),
	);
});

test("the plugin serves its virtual modules and no other id", () => {
	const plugin = screensPlugin(options);
	const resolveId = plugin.resolveId as (id: string) => string | undefined;
	const load = plugin.load as (id: string) => string | undefined;
	assert.equal(resolveId("virtual:stack-screens"), "\0virtual:stack-screens");
	const id = screenModuleId("/projects");
	assert.equal(resolveId(id), `\0${id}`);
	assert.equal(resolveId("react"), undefined);
	assert.equal(load("/src/app/x.tsx"), undefined);
	assert.equal(load("\0virtual:stack-providers"), undefined);
	assert.equal(load(`\0${id}`), screenModule("/projects"));
	assert.ok(load("\0virtual:stack-screens")?.includes("export const prefixes"));
});
