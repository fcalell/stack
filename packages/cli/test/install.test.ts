import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { stackWorkspaceRoot, toWorkspaceSpecs } from "../src/lib/install.ts";

// A stack checkout: a workspace whose projects include the CLI and `apps/*`.
function checkout(globs = ["packages/*", "apps/*", "!apps/ignored"]): string {
	const root = realpathSync(mkdtempSync(join(tmpdir(), "stack-workspace-")));
	writeFileSync(
		join(root, "pnpm-workspace.yaml"),
		`packages:\n${globs.map((g) => `  - "${g}"\n`).join("")}`,
	);
	for (const dir of ["packages/cli", "apps/phone", "apps/ignored", "tools/x"]) {
		mkdirSync(join(root, dir), { recursive: true });
	}
	return root;
}

test("a fresh directory among the CLI's workspace projects installs from the workspace", () => {
	const root = checkout();
	assert.equal(
		stackWorkspaceRoot(join(root, "apps/phone"), join(root, "packages/cli")),
		root,
	);
});

test("a directory no project glob names installs from stack's repository", () => {
	const root = checkout();
	const cli = join(root, "packages/cli");
	assert.equal(stackWorkspaceRoot(join(root, "tools/x"), cli), null);
	assert.equal(stackWorkspaceRoot(join(root, "apps/ignored"), cli), null);
});

test("a workspace the CLI is not a project of installs from stack's repository", () => {
	const root = checkout();
	const elsewhere = realpathSync(mkdtempSync(join(tmpdir(), "stack-cli-")));
	assert.equal(stackWorkspaceRoot(join(root, "apps/phone"), elsewhere), null);
});

test("an app with its own pnpm-workspace.yaml is its own workspace", () => {
	const root = checkout();
	writeFileSync(join(root, "apps/phone/pnpm-workspace.yaml"), "");
	assert.equal(
		stackWorkspaceRoot(join(root, "apps/phone"), join(root, "packages/cli")),
		null,
	);
});

test("a directory outside any workspace installs from stack's repository", () => {
	const dir = realpathSync(mkdtempSync(join(tmpdir(), "stack-app-")));
	assert.equal(stackWorkspaceRoot(dir, dir), null);
});

test("an app in stack's own checkout installs from the checkout", () => {
	const root = realpathSync(join(import.meta.dirname, "../../.."));
	assert.equal(stackWorkspaceRoot(join(root, "apps/showcase")), root);
});

test("a workspace glob matches as pnpm reads it, normalised", () => {
	const root = checkout(["./packages//*", "./apps/*", "!./apps/ignored"]);
	const cli = join(root, "packages/cli");
	assert.equal(stackWorkspaceRoot(join(root, "apps/phone"), cli), root);
	assert.equal(stackWorkspaceRoot(join(root, "apps/ignored"), cli), null);
});

test("every stack package becomes the workspace's own, nothing else changes", () => {
	assert.deepEqual(
		toWorkspaceSpecs({
			name: "phone",
			dependencies: {
				"@fcalell/plugin-native-ui":
					"github:fcalell/stack#path:/plugins/native-ui",
				expo: "~56.0.0",
			},
			devDependencies: {
				"@fcalell/cli": "github:fcalell/stack#path:/packages/cli",
				"@fcalell/other": "^1.0.0",
			},
		}),
		{
			name: "phone",
			dependencies: {
				"@fcalell/plugin-native-ui": "workspace:*",
				expo: "~56.0.0",
			},
			devDependencies: {
				"@fcalell/cli": "workspace:*",
				"@fcalell/other": "^1.0.0",
			},
		},
	);
});
