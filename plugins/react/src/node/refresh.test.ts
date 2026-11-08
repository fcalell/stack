import assert from "node:assert/strict";
import { test } from "node:test";
import { scriptHash } from "@fcalell/plugin-vite/csp";
import type { UserConfig } from "vite";
import { refreshPolicyPlugin } from "./refresh.ts";

const PREAMBLE = `import { injectIntoGlobalHook } from "__BASE__@react-refresh";
injectIntoGlobalHook(window);`;

// The hook reads neither `this` nor its `env` argument.
const configHook = refreshPolicyPlugin(PREAMBLE).config as unknown as (
	config: UserConfig,
) => UserConfig | undefined;

const withPolicy = (policy: string, base?: string): UserConfig => ({
	base,
	server: { headers: { "Content-Security-Policy": policy } },
});

test("the dev server's script-src allows the preamble the page carries", () => {
	const hash = scriptHash(PREAMBLE.replace("__BASE__", "/"));
	assert.deepEqual(
		configHook(withPolicy("frame-ancestors 'none'; script-src 'self'")),
		{
			server: {
				headers: {
					"Content-Security-Policy": `frame-ancestors 'none'; script-src 'self' ${hash}`,
				},
			},
		},
	);
});

test("the preamble is hashed with the config's base", () => {
	const hash = scriptHash(PREAMBLE.replace("__BASE__", "/app/"));
	assert.equal(
		configHook(withPolicy("script-src 'self'", "/app/"))?.server?.headers?.[
			"Content-Security-Policy"
		],
		`script-src 'self' ${hash}`,
	);
});

test("a config with no policy is left alone", () => {
	assert.equal(configHook({}), undefined);
	assert.equal(
		configHook({ server: { headers: { "X-Test": "1" } } }),
		undefined,
	);
});

test("the plugin runs on the dev server only", () => {
	assert.equal(refreshPolicyPlugin(PREAMBLE).apply, "serve");
});
