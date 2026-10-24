import assert from "node:assert/strict";
import { test } from "node:test";
import { stackConfigTemplate } from "./stack-config.ts";

test("quotes and backslashes in values stay inside their string", () => {
	const name = 'my "app" \\ x';
	const domain = 'ex"ample.com';
	const source = stackConfigTemplate({
		name,
		domain,
		plugins: ["db"],
		pluginAnswers: new Map([["db", { databaseId: 'a"b\\c', n: 1 }]]),
	});
	assert.ok(source.includes(`name: ${JSON.stringify(name)},`));
	assert.ok(source.includes(`domain: ${JSON.stringify(domain)},`));
	assert.ok(source.includes(`databaseId: ${JSON.stringify('a"b\\c')}`));
	// The app block evaluates back to the original values.
	const block = source.slice(
		source.indexOf("app: {"),
		source.indexOf("plugins:"),
	);
	const app = new Function(`return ({ ${block} }).app;`)();
	assert.deepEqual(app, { name, domain });
});
