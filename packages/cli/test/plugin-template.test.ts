import assert from "node:assert/strict";
import { test } from "node:test";
import { pluginFiles } from "../src/commands/plugin.ts";
import { PACKAGE_MANAGER } from "../src/lib/stack-packages.ts";

function scaffold(workspace: boolean) {
	const files = new Map(
		pluginFiles({ name: "x", packageName: "stack-plugin-x", workspace }),
	);
	const pkg = JSON.parse(files.get("package.json") ?? "{}");
	return { files, pkg };
}

test("a scaffolded plugin installs stack from GitHub", () => {
	const { files, pkg } = scaffold(false);
	assert.equal(
		pkg.dependencies["@fcalell/cli"],
		"github:fcalell/stack#path:/packages/cli",
	);
	assert.equal(
		pkg.devDependencies["@fcalell/typescript-config"],
		"github:fcalell/stack#path:/packages/typescript-config",
	);
	assert.ok(files.has("pnpm-workspace.yaml"));
	assert.equal(pkg.packageManager, PACKAGE_MANAGER);
});

test("a plugin scaffolded inside stack's workspace takes the workspace's packages and writes no pnpm-workspace.yaml", () => {
	const { files, pkg } = scaffold(true);
	assert.equal(pkg.dependencies["@fcalell/cli"], "workspace:*");
	assert.equal(
		pkg.devDependencies["@fcalell/typescript-config"],
		"workspace:*",
	);
	assert.equal(pkg.devDependencies.typescript, "^5.9.3");
	assert.ok(!files.has("pnpm-workspace.yaml"));
	assert.equal(pkg.packageManager, undefined);
});
