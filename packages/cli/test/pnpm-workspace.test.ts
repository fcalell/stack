import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "yaml";
import type { StackPackage } from "../src/lib/stack-packages.ts";
import { pnpmWorkspaceTemplate } from "../src/templates/pnpm-workspace.ts";

const workspace = (existing: string | null, packages: StackPackage[]) =>
	parse(pnpmWorkspaceTemplate(existing, packages));

test("a vite app overrides the stack packages its plugins reach", () => {
	const yaml = workspace(null, ["@fcalell/cli", "@fcalell/plugin-vite"]);
	assert.deepEqual(yaml.overrides, {
		"@fcalell/cli": "github:fcalell/stack#path:/packages/cli",
		"@fcalell/plugin-api": "github:fcalell/stack#path:/plugins/api",
		"@fcalell/plugin-vite": "github:fcalell/stack#path:/plugins/vite",
	});
	assert.equal(yaml.blockExoticSubdeps, false);
});

test("each stack package's build is approved by repository URL", () => {
	const yaml = workspace(null, ["@fcalell/plugin-vite"]);
	assert.deepEqual(yaml.allowBuilds, {
		"@fcalell/cli@git+https://github.com/fcalell/stack.git": true,
		"@fcalell/plugin-api@git+https://github.com/fcalell/stack.git": true,
		"@fcalell/plugin-vite@git+https://github.com/fcalell/stack.git": true,
		esbuild: true,
		workerd: true,
	});
});

test("the app's own entries are kept", () => {
	const yaml = workspace(
		'overrides:\n  "@fcalell/cli": "link:../stack/packages/cli"\nallowBuilds:\n  esbuild: false\n',
		["@fcalell/cli", "@fcalell/plugin-api"],
	);
	assert.equal(yaml.overrides["@fcalell/cli"], "link:../stack/packages/cli");
	assert.equal(
		yaml.overrides["@fcalell/plugin-api"],
		"github:fcalell/stack#path:/plugins/api",
	);
	assert.equal(yaml.allowBuilds.esbuild, false);
});
