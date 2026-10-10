import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const COMPONENTS = join(ROOT, "src/ui/components");

// An app with the routes `/` and `/notes`, declared as expo-router's
// generator writes them into `.stack/routes.d.ts`.
const ROUTES = `import * as Router from "expo-router";
export * from "expo-router";
declare module "expo-router" {
	export namespace ExpoRouter {
		export interface __routes<T extends string | object = string> {
			hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: \`/\`; params?: Router.UnknownInputParams; } | { pathname: \`/notes\`; params?: Router.UnknownInputParams; };
			hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: \`/\`; params?: Router.UnknownOutputParams; } | { pathname: \`/notes\`; params?: Router.UnknownOutputParams; };
			href: Router.RelativePathString | Router.ExternalPathString | \`/\${\`?\${string}\` | \`#\${string}\` | ''}\` | \`/notes\${\`?\${string}\` | \`#\${string}\` | ''}\` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: \`/\`; params?: Router.UnknownInputParams; } | { pathname: \`/notes\`; params?: Router.UnknownInputParams; };
		}
	}
}
`;

// One probe file of a ListRow's and a Screen's props naming these routes.
function probeOf(href: string, back: string): string {
	return `import type { ListRowProps } from ${JSON.stringify(join(COMPONENTS, "list-row/index.tsx"))};
import type { ScreenProps } from ${JSON.stringify(join(COMPONENTS, "screen/index.tsx"))};
export const row: ListRowProps = { title: "Row", href: ${JSON.stringify(href)} };
export const screen: ScreenProps = { title: "Probe", back: ${JSON.stringify(back)} };
`;
}

const PROBES = {
	known: probeOf("/notes", "/"),
	missing: probeOf("/missing", "/nope"),
};

// The type errors of each probe, checked under this package's compiler
// options beside the app's routes. Every probe goes in one program: building
// one costs seconds.
let checked: Record<keyof typeof PROBES, string[]> | undefined;
function typeErrors(probe: keyof typeof PROBES): string[] {
	checked ??= checkProbes();
	return checked[probe];
}

function checkProbes(): Record<keyof typeof PROBES, string[]> {
	const dir = mkdtempSync(join(tmpdir(), "stack-native-routes-"));
	try {
		const routes = join(dir, "routes.d.ts");
		writeFileSync(routes, ROUTES);
		const files = Object.fromEntries(
			Object.entries(PROBES).map(([name, text]) => {
				const file = join(dir, `${name}.ts`);
				writeFileSync(file, text);
				return [name, file];
			}),
		) as Record<keyof typeof PROBES, string>;
		const config = ts.getParsedCommandLineOfConfigFile(
			join(ROOT, "tsconfig.json"),
			{},
			{ ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} },
		);
		assert.ok(config);
		const expoRouter = dirname(
			createRequire(join(ROOT, "package.json")).resolve(
				"expo-router/package.json",
			),
		);
		const program = ts.createProgram([routes, ...Object.values(files)], {
			...config.options,
			noEmit: true,
			skipLibCheck: true,
			baseUrl: dir,
			paths: { "expo-router": [expoRouter] },
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

test("a ListRow href and a Screen back naming the app's routes type-check", () => {
	assert.deepEqual(typeErrors("known"), []);
});

test("a ListRow href and a Screen back naming a route the app does not have fail the type-check", () => {
	const errors = typeErrors("missing");
	assert.equal(errors.length, 2, errors.join("\n"));
	assert.ok(errors.some((error) => error.includes('"/missing"')));
	assert.ok(errors.some((error) => error.includes('"/nope"')));
});
