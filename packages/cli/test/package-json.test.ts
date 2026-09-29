import assert from "node:assert/strict";
import { test } from "node:test";
import { packageJsonTemplate } from "../src/templates/package-json.ts";

const devDependencies = (plugins: string[]): Record<string, string> =>
	JSON.parse(packageJsonTemplate({ name: "app", plugins })).devDependencies;

test("the node target carries Node's types and no wrangler", () => {
	const dev = devDependencies(["api", "node", "solid"]);
	assert.equal(dev.wrangler, undefined);
	assert.ok(dev["@types/node"]);
});

test("the cloudflare target carries wrangler", () => {
	const dev = devDependencies(["api", "cloudflare", "solid"]);
	assert.ok(dev.wrangler);
	assert.equal(dev["@types/node"], undefined);
});
