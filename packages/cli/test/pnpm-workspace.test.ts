import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "yaml";
import {
	isStackPackage,
	STACK_PACKAGES,
	type StackPackage,
} from "../src/lib/stack-packages.ts";
import { pnpmWorkspaceTemplate } from "../src/templates/pnpm-workspace.ts";

const workspace = (existing: string | null, packages: StackPackage[]) =>
	parse(pnpmWorkspaceTemplate(existing, packages));

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

test("an auth app builds better-sqlite3 from its first install", () => {
	const yaml = workspace(null, ["@fcalell/cli", "@fcalell/plugin-auth"]);
	assert.equal(yaml.allowBuilds["better-sqlite3"], true);
	assert.equal(yaml.allowBuilds.esbuild, true);
});

test("every stack package agrees on each build it brings", () => {
	assert.doesNotThrow(() =>
		pnpmWorkspaceTemplate(
			null,
			Object.keys(STACK_PACKAGES).filter(isStackPackage),
		),
	);
});

test("the app's own entries are kept", () => {
	const yaml = workspace(
		'overrides:\n  "@fcalell/cli": "link:../stack/packages/cli"\nallowBuilds:\n  esbuild: false\nchildConcurrency: 4\n',
		["@fcalell/cli", "@fcalell/plugin-api"],
	);
	assert.equal(yaml.overrides["@fcalell/cli"], "link:../stack/packages/cli");
	assert.equal(
		yaml.overrides["@fcalell/plugin-api"],
		"github:fcalell/stack#path:/plugins/api",
	);
	assert.equal(yaml.allowBuilds.esbuild, false);
	assert.equal(yaml.childConcurrency, 4);
});
