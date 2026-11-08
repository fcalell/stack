import assert from "node:assert/strict";
import { test } from "node:test";
import { scriptHash } from "@fcalell/plugin-vite/csp";
import { modeScript, modeScriptPolicy, themeModePlugin } from "./mode.ts";

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
