import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { buildRoutesDts } from "../src/node/routes.ts";

// This package's root: it installs `expo`, as an app does.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
// `test/fixtures/routes/app`: `/`, `/projects` and `/projects/[id]`.
const APP_DIR = "test/fixtures/routes/app";

// The expo-router the generator reads routes with, whose `Href` the probe
// types against.
function expoRouterDir(): string {
	const app = createRequire(join(ROOT, "package.json"));
	const expo = createRequire(app.resolve("expo/package.json"));
	const cli = createRequire(expo.resolve("@expo/cli/package.json"));
	const server = createRequire(cli.resolve("@expo/router-server/package.json"));
	return dirname(server.resolve("expo-router/package.json"));
}

// The type errors of `probe` checked beside the generated routes, one line
// each.
function typeErrors(probe: string): string[] {
	const dir = mkdtempSync(join(tmpdir(), "stack-expo-routes-"));
	try {
		const routes = join(dir, "routes.d.ts");
		const file = join(dir, "probe.ts");
		writeFileSync(routes, buildRoutesDts(ROOT, APP_DIR));
		writeFileSync(file, probe);
		const program = ts.createProgram([routes, file], {
			strict: true,
			noEmit: true,
			skipLibCheck: true,
			target: ts.ScriptTarget.ESNext,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			jsx: ts.JsxEmit.ReactJSX,
			baseUrl: dir,
			paths: { "expo-router": [expoRouterDir()] },
		});
		return ts
			.getPreEmitDiagnostics(program)
			.filter((diagnostic) => diagnostic.file?.fileName === file)
			.map((diagnostic) =>
				ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
			);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

test("a route file's path type-checks as an href", () => {
	assert.deepEqual(
		typeErrors(`import type { Href } from "expo-router";
const home: Href = "/";
const list: Href = "/projects";
const record: Href = "/projects/12";
const query: Href = "/projects?sort=name";
void [home, list, record, query];
`),
		[],
	);
});

test("a path with no route file does not type-check as an href", () => {
	const errors = typeErrors(`import type { Href } from "expo-router";
const missing: Href = "/settings";
void missing;
`);
	assert.equal(errors.length, 1);
	assert.match(errors[0] ?? "", /"\/settings"/);
});
