import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { STACK_PACKAGES, stackClosure } from "../src/lib/stack-packages.ts";

const root = join(import.meta.dirname, "../../..");

function manifest(dir: string): {
	name: string;
	dependencies?: Record<string, string>;
} {
	return JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8"));
}

test("each entry is the package in its directory, with its first-party dependencies", () => {
	for (const [name, entry] of Object.entries(STACK_PACKAGES)) {
		const pkg = manifest(entry.dir);
		assert.equal(pkg.name, name);
		assert.deepEqual(
			[...entry.dependencies].sort(),
			Object.keys(pkg.dependencies ?? {})
				.filter((n) => n.startsWith("@fcalell/"))
				.sort(),
			name,
		);
	}
});

test("every plugin is in the table", () => {
	for (const dir of readdirSync(join(root, "plugins"))) {
		assert.ok(manifest(`plugins/${dir}`).name in STACK_PACKAGES, dir);
	}
});

test("the closure follows dependencies a plugin does not require", () => {
	assert.deepEqual(stackClosure(["@fcalell/plugin-vite"]), [
		"@fcalell/cli",
		"@fcalell/plugin-api",
		"@fcalell/plugin-vite",
	]);
});
