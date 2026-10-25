import assert from "node:assert/strict";
import { test } from "node:test";
import {
	modeScript,
	modeScriptPolicy,
	scriptHash,
	themeModePlugin,
} from "./mode.ts";

test("the hash of a known script is the browser's source expression", () => {
	assert.equal(
		scriptHash("alert(1)"),
		"'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='",
	);
});

test("the hash covers the text exactly, whitespace included", () => {
	assert.notEqual(scriptHash("alert(1)"), scriptHash("alert(1) "));
});

const configs = [
	["no config", undefined, {}],
	["a default mode", "dark", {}],
	["a scrambled loading text", "light", { text: "scramble" }],
	[
		"every slot scrambled",
		undefined,
		{ text: "scramble", figure: "scramble", id: "scramble" },
	],
	["pulsed slots", "dark", { text: "pulse" }],
] as const;

for (const [name, mode, loading] of configs) {
	test(`the policy is script-src 'self' plus the hash of the rendered script: ${name}`, () => {
		assert.equal(
			modeScriptPolicy(mode, loading),
			`script-src 'self' ${scriptHash(modeScript(mode, loading))}`,
		);
	});

	test(`the policy hashes the script the plugin injects: ${name}`, () => {
		const transform = themeModePlugin(mode, loading).transformIndexHtml;
		assert.ok(transform && typeof transform === "object");
		const tags = (
			transform.handler as unknown as () => { children: string }[]
		)();
		assert.equal(tags.length, 1);
		assert.equal(
			modeScriptPolicy(mode, loading),
			`script-src 'self' ${scriptHash(tags[0]?.children ?? "")}`,
		);
	});
}
