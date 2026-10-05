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

// The type errors of a ListRow's and a Screen's props naming these routes,
// checked under this package's compiler options beside the app's
// routes.
function typeErrors(href: string, back: string): string[] {
	const dir = mkdtempSync(join(tmpdir(), "stack-native-routes-"));
	try {
		const routes = join(dir, "routes.d.ts");
		const probe = join(dir, "probe.ts");
		writeFileSync(routes, ROUTES);
		writeFileSync(
			probe,
			`import type { ListRowProps } from ${JSON.stringify(join(COMPONENTS, "list-row/index.tsx"))};
import type { ScreenProps } from ${JSON.stringify(join(COMPONENTS, "screen/index.tsx"))};
export const row: ListRowProps = { title: "Row", href: ${JSON.stringify(href)} };
export const screen: ScreenProps = { title: "Probe", back: ${JSON.stringify(back)} };
`,
		);
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
		const program = ts.createProgram([routes, probe], {
			...config.options,
			noEmit: true,
			skipLibCheck: true,
			baseUrl: dir,
			paths: { "expo-router": [expoRouter] },
		});
		return ts
			.getPreEmitDiagnostics(program)
			.filter((diagnostic) => diagnostic.file?.fileName === probe)
			.map((diagnostic) =>
				ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
			);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

test("a ListRow href and a Screen back naming the app's routes type-check", () => {
	assert.deepEqual(typeErrors("/notes", "/"), []);
});

test("a ListRow href and a Screen back naming a route the app does not have fail the type-check", () => {
	const errors = typeErrors("/missing", "/nope");
	assert.equal(errors.length, 2, errors.join("\n"));
	assert.ok(errors.some((error) => error.includes('"/missing"')));
	assert.ok(errors.some((error) => error.includes('"/nope"')));
});
