import assert from "node:assert/strict";
import { test } from "node:test";
import { packageJsonTemplate } from "../src/templates/package-json.ts";

const devDependencies = (plugins: string[]): Record<string, string> =>
	JSON.parse(packageJsonTemplate({ name: "app", plugins })).devDependencies;

test("the node target carries Node's types and no wrangler", () => {
	const dev = devDependencies(["api", "node", "vite"]);
	assert.equal(dev.wrangler, undefined);
	assert.ok(dev["@types/node"]);
});

test("the cloudflare target carries wrangler", () => {
	const dev = devDependencies(["api", "cloudflare", "vite"]);
	assert.ok(dev.wrangler);
	assert.equal(dev["@types/node"], undefined);
});

test("a React web app declares React, React DOM and their types", () => {
	const pkg = JSON.parse(
		packageJsonTemplate({ name: "app", plugins: ["vite", "react"] }),
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
