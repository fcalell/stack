import assert from "node:assert/strict";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	statSync,
	utimesSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { ancestorIds, checkVariants } from "../src/node/screens.ts";
import { renderStoryFile, syncStories } from "../src/node/stories.ts";
import type { PreviewGlobal } from "../src/types.ts";
import { overflowError, WIDTHS } from "../src/ui/overflow.ts";

const mode: PreviewGlobal = {
	name: "mode",
	title: "Mode",
	values: ["light", "dark"],
	default: "light",
	checked: ["light", "dark"],
	apply: { classes: { dark: "dark" } },
};
const density: PreviewGlobal = {
	name: "density",
	title: "Density",
	values: ["desktop", "touch"],
	default: "desktop",
	apply: { attribute: "data-density" },
};

test("a screen's routes are the prefixes of its id", () => {
	assert.deepEqual(ancestorIds("/_app/deploys/$id/"), [
		"/_app",
		"/_app/deploys",
		"/_app/deploys/$id",
	]);
	assert.deepEqual(ancestorIds("/_app/deploys/$id"), [
		"/_app",
		"/_app/deploys",
	]);
	assert.deepEqual(ancestorIds("/projects"), []);
	assert.deepEqual(ancestorIds("/projects/"), ["/projects"]);
	assert.deepEqual(ancestorIds("/"), []);
});

test("a global checks its default alone unless it names more", () => {
	assert.deepEqual(checkVariants([density]), []);
	assert.deepEqual(checkVariants([density, mode]), [
		{ globals: { density: "desktop", mode: "dark" }, label: ["dark"] },
	]);
});

test("every combination of the checked values is a variant, named for what differs from the defaults", () => {
	const both = { ...density, checked: ["desktop", "touch"] };
	assert.deepEqual(checkVariants([both, mode]), [
		{ globals: { density: "desktop", mode: "dark" }, label: ["dark"] },
		{ globals: { density: "touch", mode: "light" }, label: ["touch"] },
		{ globals: { density: "touch", mode: "dark" }, label: ["touch", "dark"] },
	]);
	// A default the check leaves out is still the dev story's.
	const darkOnly = { ...mode, checked: ["dark"] };
	assert.deepEqual(checkVariants([darkOnly]), [
		{ globals: { mode: "dark" }, label: ["dark"] },
	]);
});

test("a story file draws each state and hides its check variants from the sidebar", () => {
	const source = renderStoryFile("/projects/$id", ["../src/x.tsx"], [mode]);
	assert.ok(
		source.includes(
			'export const NotFound = { ...screenStory("/projects/$id", "notFound"), name: "Not found" };',
		),
	);
	assert.ok(
		source.includes(
			'export const NotFoundDark = { ...screenStory("/projects/$id", "notFound", {"mode":"dark"}), name: "Not found, dark", tags: ["!dev"] };',
		),
	);
	assert.ok(
		source.includes('export default { title: "Screens/projects/$id" };'),
	);
	// Only the check variants carry the tag.
	assert.equal(source.match(/tags: \["!dev"\]/g)?.length, 5);
});

function app(files: Record<string, string>): string {
	const root = mkdtempSync(join(tmpdir(), "stack-screens-"));
	for (const [path, content] of Object.entries(files)) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), content);
	}
	return root;
}

const routes = {
	"src/app/routes/__root.tsx": "createRootRoute({})",
	"src/app/routes/_app/route.tsx": 'createFileRoute("/_app")({})',
	"src/app/routes/_app/deploys/route.tsx":
		'createFileRoute("/_app/deploys")({})',
	"src/app/routes/_app/deploys/index.tsx":
		'createFileRoute("/_app/deploys/")({})',
	"src/app/routes/_app/deploys/$id.tsx":
		'createFileRoute("/_app/deploys/$id")({})',
	"src/app/routes/_app/deploys/$id.lazy.tsx":
		'createLazyFileRoute("/_app/deploys/$id")({})',
	"src/app/routes/sign-in.tsx": 'createFileRoute("/sign-in")({})',
	"src/app/routes/helpers.ts": "export const x = 1;",
};

const sync = (root: string) =>
	syncStories({
		root,
		routes: join(root, "src/app/routes"),
		fixtures: join(root, "src/app/fixtures.ts"),
		previewGlobals: [mode],
	});

const story = (root: string, file: string) => join(root, "stack-screens", file);

test("each route is one story file mirroring its id, a pathless layout none", async () => {
	const root = app(routes);
	await sync(root);
	for (const file of [
		"_app/deploys/index.stories.ts",
		"_app/deploys/$id.stories.ts",
		"_app/deploys.stories.ts",
		"sign-in.stories.ts",
	]) {
		assert.ok(existsSync(story(root, file)), file);
	}
	assert.equal(existsSync(story(root, "_app.stories.ts")), false);
	assert.equal(existsSync(story(root, "helpers.stories.ts")), false);
});

test("a nested route's story file imports the graph of its screen", async () => {
	const root = app({ ...routes, "src/app/fixtures.ts": "export default {};" });
	await sync(root);
	const source = readFileSync(
		story(root, "_app/deploys/$id.stories.ts"),
		"utf8",
	);
	const imports = [...source.matchAll(/^import "(.+)";$/gm)].map((m) => m[1]);
	// The root, each layout from the outside in, the route and its lazy
	// sibling, then the fixtures.
	assert.deepEqual(imports, [
		"../../../src/app/routes/__root.tsx",
		"../../../src/app/routes/_app/route.tsx",
		"../../../src/app/routes/_app/deploys/route.tsx",
		"../../../src/app/routes/_app/deploys/$id.lazy.tsx",
		"../../../src/app/routes/_app/deploys/$id.tsx",
		"../../../src/app/fixtures.ts",
	]);
	assert.match(source, /^\/\/ Generated by `stack screens`/);
	const top = readFileSync(story(root, "sign-in.stories.ts"), "utf8");
	assert.ok(top.includes('import "../src/app/routes/__root.tsx";'));
	assert.ok(!top.includes("route.tsx"));
});

test("a file is rewritten only when its content changed", async () => {
	const root = app(routes);
	await sync(root);
	const path = story(root, "sign-in.stories.ts");
	const past = new Date(2020, 0, 1);
	utimesSync(path, past, past);
	await sync(root);
	assert.equal(statSync(path).mtimeMs, past.getTime());

	// The fixtures file appears: it joins every screen's graph.
	writeFileSync(join(root, "src/app/fixtures.ts"), "export default {};");
	await sync(root);
	assert.notEqual(statSync(path).mtimeMs, past.getTime());
	assert.match(readFileSync(path, "utf8"), /src\/app\/fixtures\.ts/);

	// An edit to the route file rewrites nothing.
	utimesSync(path, past, past);
	writeFileSync(
		join(root, "src/app/routes/sign-in.tsx"),
		'createFileRoute("/sign-in")({ component: () => null })',
	);
	await sync(root);
	assert.equal(statSync(path).mtimeMs, past.getTime());
});

test("a deleted route's file goes with the folders it leaves empty", async () => {
	const root = app(routes);
	await sync(root);
	const { rmSync } = await import("node:fs");
	rmSync(join(root, "src/app/routes/_app/deploys"), { recursive: true });
	await sync(root);
	assert.equal(existsSync(story(root, "_app")), false);
	assert.ok(existsSync(story(root, "sign-in.stories.ts")));

	rmSync(join(root, "src/app/routes"), { recursive: true });
	await sync(root);
	assert.equal(existsSync(story(root, "sign-in.stories.ts")), false);
});

test("a screen that fits is no failure at any width", () => {
	assert.deepEqual(WIDTHS, [320, 390, 768, 1280, 1440]);
	assert.equal(overflowError(320, 320, 320), null);
	assert.equal(
		overflowError(390, 412, 390),
		"horizontal overflow at 390px: scrollWidth 412",
	);
});
