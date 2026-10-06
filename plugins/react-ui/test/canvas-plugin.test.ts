import assert from "node:assert/strict";
import { test } from "node:test";
import { canvasPlugin } from "../src/node/canvas.ts";

test("canvasPlugin serves the layout module as source and pre-bundles ELK's CJS API by name", () => {
	const plugin = canvasPlugin();
	assert.equal(plugin.name, "fcalell:canvas");
	const config = plugin.config;
	assert.equal(typeof config, "function");
	const result = (config as () => unknown)();
	assert.deepEqual(result, {
		optimizeDeps: {
			exclude: ["@fcalell/plugin-react-ui/lib/canvas-layout"],
			include: ["@fcalell/plugin-react-ui > elkjs/lib/elk-api.js"],
		},
	});
});
