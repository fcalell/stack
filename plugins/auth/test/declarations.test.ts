import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { test } from "node:test";

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
// among them, is `any`. It reads the declarations the build emitted, so the
// package's `test` task runs after its own `build` (turbo.json).
test("the emitted declarations import only packages this one depends on", () => {
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
	const dist = resolve(packageDir, "dist");
	const declarations = readdirSync(dist, {
		recursive: true,
		encoding: "utf-8",
	}).filter((file) => file.endsWith(".d.ts"));
	assert.ok(declarations.length > 0, "build the package first");
	for (const file of declarations) {
		const text = readFileSync(resolve(dist, file), "utf-8");
		for (const [, specifier] of text.matchAll(
			/(?:from |import\()"([^"./][^"]*)"/g,
		)) {
			if (specifier === undefined) continue;
			if (specifier.startsWith("node:") || builtinModules.includes(specifier))
				continue;
			const name = packageOf(specifier);
			if (!declared.has(name)) undeclared.add(`${name} (${specifier})`);
		}
	}
	assert.deepEqual([...undeclared], []);
});
