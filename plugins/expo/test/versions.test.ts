import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { z } from "zod";
import { expo } from "../src/index.ts";

const require = createRequire(import.meta.url);

// The version react-native's renderer checks React against at startup.
function rendererVersion(): string {
	const renderer = require.resolve(
		"react-native/Libraries/Renderer/implementations/ReactNativeRenderer-prod.js",
	);
	const match = readFileSync(renderer, "utf8").match(
		/reconcilerVersion: "([^"]+)"/,
	);
	assert.ok(match?.[1], "the renderer names its reconciler version");
	return match[1];
}

test("the scaffolded react is the version react-native's renderer accepts", () => {
	assert.equal(expo.cli.dependencies.react, rendererVersion());
});

// A workspace phone app bundles these plugins' sources, so the React each
// resolves must be the SDK's, or the app carries a second React.
test("the plugins a phone app bundles develop against the SDK's react", () => {
	const sdkReact = z
		.object({ react: z.string() })
		.parse(require("expo/bundledNativeModules.json")).react;
	const manifest = z.object({
		devDependencies: z.object({ react: z.string() }),
	});
	for (const plugin of ["api", "auth", "native-ui"]) {
		const { devDependencies } = manifest.parse(
			JSON.parse(
				readFileSync(
					new URL(`../../${plugin}/package.json`, import.meta.url),
					"utf8",
				),
			),
		);
		assert.equal(devDependencies.react, sdkReact, plugin);
	}
});
