import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
	buildTree,
	emitRoutes,
	emitVirtualModule,
} from "../src/node/routes-core.ts";

const paths = (routesArray: string) =>
	[...routesArray.matchAll(/path: "([^"]*)"/g)].map((m) => m[1]);

test("a child's path is written relative to its nearest layout, so the router's join lands on the file's URL", () => {
	const { root, notFoundFile } = buildTree(
		[
			"_layout.tsx",
			"index.tsx",
			"chats/_layout.tsx",
			"chats/index.tsx",
			"chats/[id].tsx",
			"(inbox)/_layout.tsx",
			"(inbox)/inbox/[id].tsx",
			"(inbox)/inbox/[id]/files/[...path].tsx",
		],
		"/app/src/pages",
	);
	const { routesArray } = emitRoutes(root, "/app", notFoundFile);
	assert.deepEqual(paths(routesArray), [
		"/",
		"/",
		"/chats",
		"/",
		"/:id",
		"/",
		"/inbox/:id",
		"/inbox/:id/files/*path",
	]);
});

test("a page that exports a search schema gets a typed, serialized search argument", () => {
	const pages = mkdtempSync(join(tmpdir(), "stack-routes-"));
	mkdirSync(join(pages, "[org]"), { recursive: true });
	writeFileSync(
		join(pages, "[org]/canvas.tsx"),
		"export const search = z.object({ journey: z.string().optional() });\n",
	);
	writeFileSync(join(pages, "login.tsx"), "export default () => null;\n");
	const { root } = buildTree(["[org]/canvas.tsx", "login.tsx"], pages);
	const { typedRoutesRuntime, typedRoutesTypes } = emitRoutes(
		root,
		pages,
		undefined,
		join(pages, ".stack"),
	);
	assert.match(
		typedRoutesRuntime,
		/"canvas": \(params, search\) => withSearch\(`\/\$\{params\.org\}\/canvas`, search\)/,
	);
	assert.match(typedRoutesRuntime, /"login": \(\) => "\/login"/);
	assert.match(
		typedRoutesTypes,
		/"canvas": \(params: \{ org: string \| number \}, search\?: SearchInput<\(typeof import\("\.\.\/\[org\]\/canvas\.tsx"\)\)\["search"\]>\) => string;/,
	);
});

test("the generated module appends only the search values that are set", () => {
	const module = emitVirtualModule("[]", "{}");
	const withSearch = new Function(
		`${module.match(/const withSearch = [\s\S]*?\n\};/)?.[0]}\nreturn withSearch;`,
	)() as (url: string, search?: Record<string, unknown>) => string;
	assert.equal(
		withSearch("/a", { journey: "x", page: undefined }),
		"/a?journey=x",
	);
	assert.equal(withSearch("/a", {}), "/a");
});
