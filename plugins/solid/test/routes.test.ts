import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTree, emitRoutes } from "../src/node/routes-core.ts";

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
