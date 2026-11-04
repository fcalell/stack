import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { excludedImports, importsOf } from "./excluded.ts";

function write(root: string, path: string, content: string): void {
	const file = join(root, path);
	mkdirSync(join(file, ".."), { recursive: true });
	writeFileSync(file, content);
}

function app(): string {
	const root = mkdtempSync(join(tmpdir(), "excluded-"));
	const pkg = "node_modules/@acme/web";
	write(
		root,
		`${pkg}/package.json`,
		JSON.stringify({
			name: "@acme/web",
			exports: {
				"./view": "./src/view.tsx",
				"./client": { default: "./dist/client.js" },
				"./server": { default: "./dist/server.js" },
			},
		}),
	);
	write(
		root,
		`${pkg}/src/view.tsx`,
		[
			'import { client } from "@acme/web/client";',
			'import { state } from "./state.ts";',
			'import type { Only } from "types-only";',
			'import "virtual:acme-schema";',
			'import { readFile } from "node:fs";',
			'import react from "react";',
			'import { missing } from "not-installed";',
			'// import { comment } from "in-a-comment";',
		].join("\n"),
	);
	write(root, `${pkg}/src/state.ts`, 'export { z } from "zod";\n');
	write(
		root,
		`${pkg}/dist/client.js`,
		'import { fetcher } from "@orpc/client/fetch";\nimport "./helper.js";\n',
	);
	write(
		root,
		`${pkg}/dist/helper.js`,
		'export const load = () => import("@casl/ability");\n',
	);
	write(root, `${pkg}/dist/server.js`, 'import { Hono } from "hono";\n');
	for (const name of ["zod", "@orpc/client", "@casl/ability", "react", "hono"])
		write(root, `${pkg}/node_modules/${name}/package.json`, "{}");
	write(root, "node_modules/types-only/package.json", "{}");
	return root;
}

test("a file's imports are its static and dynamic specifiers, not comments", () => {
	assert.deepEqual(
		importsOf(
			'import a from "a";\nexport * from "b";\nconst c = import("c");\nimport "d";\n// import e from "e";\n/* import f from "f" */',
		),
		["a", "b", "c", "d"],
	);
});

test("a type-only import is no import", () => {
	assert.deepEqual(
		importsOf('import type { A } from "a";\nexport type { B } from "b";'),
		[],
	);
});

test("an excluded package's raw source is followed to the bare imports it reaches", () => {
	const root = app();
	assert.deepEqual(excludedImports(["@acme/web"], root, new Set(["react"])), [
		"@acme/web > @casl/ability",
		"@acme/web > @orpc/client/fetch",
		"@acme/web > zod",
	]);
});

test("a package that is not installed adds nothing", () => {
	assert.deepEqual(excludedImports(["@acme/none"], app()), []);
});

test("an excluded subpath names its own package's other subpaths as they are, not their imports", () => {
	assert.deepEqual(
		excludedImports(["@acme/web/view"], app(), new Set(["react"])),
		["@acme/web > zod", "@acme/web/client"],
	);
});

test("an excluded subpath is followed, never included", () => {
	assert.deepEqual(
		excludedImports(
			["@acme/web/view", "@acme/web/client"],
			app(),
			new Set(["react"]),
		),
		[
			"@acme/web > @casl/ability",
			"@acme/web > @orpc/client/fetch",
			"@acme/web > zod",
		],
	);
});
