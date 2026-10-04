import assert from "node:assert/strict";
import { test } from "node:test";
import { packageJsonTemplate } from "../src/templates/package-json.ts";

const devDependencies = (plugins: string[]): Record<string, string> =>
	JSON.parse(packageJsonTemplate({ name: "app", plugins, workspace: false }))
		.devDependencies;

test("the node target carries Node's types and no wrangler", () => {
	const dev = devDependencies(["api", "node", "vite"]);
	assert.equal(dev.wrangler, undefined);
	assert.ok(dev["@types/node"]);
});

test("the cloudflare target carries wrangler, and Node's types for its tests", () => {
	const dev = devDependencies(["api", "cloudflare", "vite"]);
	assert.ok(dev.wrangler);
	assert.ok(dev["@types/node"]);
});

test("a React web app declares React, React DOM and their types", () => {
	const pkg = JSON.parse(
		packageJsonTemplate({
			name: "app",
			plugins: ["vite", "react"],
			workspace: false,
		}),
	);
	assert.equal(pkg.dependencies.react, "^19.3.0");
	assert.equal(pkg.dependencies["react-dom"], "^19.3.0");
	assert.equal(pkg.devDependencies["@types/react"], "^19.3.0");
	assert.equal(pkg.devDependencies["@types/react-dom"], "^19.3.0");
});

test("the native app's React types follow Expo's React", () => {
	const dev = devDependencies(["expo"]);
	assert.equal(dev["@types/react"], "~19.2.0");
	assert.equal(dev["@types/react-dom"], undefined);
});

test("every stack package is a commit-free spec from the table", () => {
	const pkg = JSON.parse(
		packageJsonTemplate({
			name: "app",
			plugins: ["api", "vite"],
			workspace: false,
		}),
	);
	assert.deepEqual(pkg.dependencies, {
		"@fcalell/plugin-api": "github:fcalell/stack#path:/plugins/api",
		"@fcalell/plugin-vite": "github:fcalell/stack#path:/plugins/vite",
	});
	assert.equal(
		pkg.devDependencies["@fcalell/cli"],
		"github:fcalell/stack#path:/packages/cli",
	);
	assert.equal(
		pkg.devDependencies["@fcalell/typescript-config"],
		"github:fcalell/stack#path:/packages/typescript-config",
	);
	assert.equal(
		pkg.devDependencies["@fcalell/biome-config"],
		"github:fcalell/stack#path:/packages/biome-config",
	);
	assert.equal(pkg.packageManager, "pnpm@11.28.3");
});

test("an app in stack's workspace leaves Biome and the package manager to the checkout", () => {
	const pkg = JSON.parse(
		packageJsonTemplate({
			name: "app",
			plugins: ["api", "vite"],
			workspace: true,
		}),
	);
	assert.equal(pkg.devDependencies["@biomejs/biome"], undefined);
	assert.equal(pkg.devDependencies["@fcalell/biome-config"], undefined);
	assert.equal(pkg.scripts.lint, undefined);
	assert.equal(pkg.scripts.check, undefined);
	assert.equal(pkg.packageManager, undefined);
	assert.ok(pkg.scripts["check-types"]);
});
