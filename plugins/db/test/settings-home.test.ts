import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { pnpmSettingsHome } from "../src/index.ts";

test("the build approval goes to the nearest pnpm-workspace.yaml above the consumer", () => {
	const root = mkdtempSync(join(tmpdir(), "stack-db-home-"));
	const pkg = join(root, "packages", "server");
	mkdirSync(pkg, { recursive: true });
	assert.equal(pnpmSettingsHome(pkg), null);
	writeFileSync(
		join(root, "pnpm-workspace.yaml"),
		"packages:\n  - packages/*\n",
	);
	assert.equal(pnpmSettingsHome(pkg), join(root, "pnpm-workspace.yaml"));
	writeFileSync(join(pkg, "pnpm-workspace.yaml"), "");
	assert.equal(pnpmSettingsHome(pkg), join(pkg, "pnpm-workspace.yaml"));
});
