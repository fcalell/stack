import assert from "node:assert/strict";
import { test } from "node:test";
import { pluginPackageJsonTemplate } from "../src/templates/plugin.ts";

test("a scaffolded plugin installs stack from GitHub", () => {
	const pkg = JSON.parse(
		pluginPackageJsonTemplate({ name: "x", packageName: "stack-plugin-x" }),
	);
	assert.equal(
		pkg.dependencies["@fcalell/cli"],
		"github:fcalell/stack#path:/packages/cli",
	);
	assert.equal(
		pkg.devDependencies["@fcalell/typescript-config"],
		"github:fcalell/stack#path:/packages/typescript-config",
	);
});
