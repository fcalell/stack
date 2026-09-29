import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import ts from "typescript";

const packageDir = resolve(import.meta.dirname, "..");

// The package a bare specifier names: `@scope/name` or `name`.
function packageOf(specifier: string): string {
	const parts = specifier.split("/");
	return specifier.startsWith("@")
		? parts.slice(0, 2).join("/")
		: (parts[0] ?? "");
}

// A consumer reads the tables and scopes through the emitted declarations,
// resolved from this package. A type named through a package this one does
// not depend on (drizzle's table type, reached through plugin-db) resolves to
// nothing there, and every row read through it, `useScope(organization)`'s
// among them, is `any`.
test("the emitted declarations import only packages this one depends on", () => {
	const configPath = resolve(packageDir, "tsconfig.build.json");
	const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
	const parsed = ts.parseJsonConfigFileContent(
		config,
		ts.sys,
		dirname(configPath),
	);
	const program = ts.createProgram(parsed.fileNames, {
		...parsed.options,
		emitDeclarationOnly: true,
		declarationMap: false,
		sourceMap: false,
	});
	const manifest = JSON.parse(
		readFileSync(resolve(packageDir, "package.json"), "utf-8"),
	) as {
		name: string;
		dependencies?: Record<string, string>;
		peerDependencies?: Record<string, string>;
	};
	const declared = new Set([
		manifest.name,
		...Object.keys(manifest.dependencies ?? {}),
		...Object.keys(manifest.peerDependencies ?? {}),
	]);
	const undeclared = new Set<string>();
	program.emit(undefined, (fileName, text) => {
		if (!fileName.endsWith(".d.ts")) return;
		for (const [, specifier] of text.matchAll(
			/(?:from |import\()"([^"./][^"]*)"/g,
		)) {
			if (specifier === undefined) continue;
			if (specifier.startsWith("node:") || builtinModules.includes(specifier))
				continue;
			const name = packageOf(specifier);
			if (!declared.has(name)) undeclared.add(`${name} (${specifier})`);
		}
	});
	assert.deepEqual([...undeclared], []);
});
