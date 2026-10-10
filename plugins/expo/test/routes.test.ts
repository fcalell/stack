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

const PROBES = {
	known: `import type { Href } from "expo-router";
const home: Href = "/";
const list: Href = "/projects";
const record: Href = "/projects/12";
const query: Href = "/projects?sort=name";
void [home, list, record, query];
`,
	missing: `import type { Href } from "expo-router";
const missing: Href = "/settings";
void missing;
`,
};

// The type errors of each probe checked beside the generated routes, one
// line each. Every probe goes in one program: building one costs seconds.
let checked: Record<keyof typeof PROBES, string[]> | undefined;
function typeErrors(probe: keyof typeof PROBES): string[] {
	checked ??= checkProbes();
	return checked[probe];
}

function checkProbes(): Record<keyof typeof PROBES, string[]> {
	const dir = mkdtempSync(join(tmpdir(), "stack-expo-routes-"));
	try {
		const routes = join(dir, "routes.d.ts");
		writeFileSync(routes, buildRoutesDts(ROOT, APP_DIR));
		const files = Object.fromEntries(
			Object.entries(PROBES).map(([name, text]) => {
				const file = join(dir, `${name}.ts`);
				writeFileSync(file, text);
				return [name, file];
			}),
		) as Record<keyof typeof PROBES, string>;
		const program = ts.createProgram([routes, ...Object.values(files)], {
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
		const diagnostics = ts.getPreEmitDiagnostics(program);
		const errorsIn = (file: string) =>
			diagnostics
				.filter((diagnostic) => diagnostic.file?.fileName === file)
				.map((diagnostic) =>
					ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
				);
		return { known: errorsIn(files.known), missing: errorsIn(files.missing) };
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

test("a route file's path type-checks as an href", () => {
	assert.deepEqual(typeErrors("known"), []);
});

test("a path with no route file does not type-check as an href", () => {
	const errors = typeErrors("missing");
	assert.equal(errors.length, 1);
	assert.match(errors[0] ?? "", /"\/settings"/);
});
