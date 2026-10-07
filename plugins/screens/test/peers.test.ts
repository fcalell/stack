import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { screens } from "../src/index.ts";

const manifest = JSON.parse(
	readFileSync(join(import.meta.dirname, "../package.json"), "utf8"),
) as {
	dependencies: Record<string, string>;
	peerDependencies: Record<string, string>;
	peerDependenciesMeta: Record<string, { optional?: boolean }>;
};

test("the packages `stack add screens` installs are the manifest's peers, at its ranges", () => {
	const installed = screens.cli.devDependencies;
	assert.ok(Object.keys(installed).length > 0);
	for (const [name, range] of Object.entries(installed)) {
		assert.equal(manifest.peerDependencies[name], range, name);
		assert.equal(manifest.dependencies[name], undefined, name);
	}
});

// An app with auth or react-ui and no `screens()` still installs this package:
// a missing peer that is not optional is auto-installed by pnpm.
test("every peer is optional", () => {
	for (const name of Object.keys(manifest.peerDependencies)) {
		assert.equal(manifest.peerDependenciesMeta[name]?.optional, true, name);
	}
});
