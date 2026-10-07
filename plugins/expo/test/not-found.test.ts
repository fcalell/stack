import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { plugin } from "@fcalell/cli";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { type ExpoOptions, expo } from "../src/index.ts";
import { hasNotFoundRoute } from "../src/node/not-found.ts";

function discover(
	factory: { cli: unknown },
	config: { __plugin: string; options: unknown },
): DiscoveredPlugin {
	return {
		name: config.__plugin,
		cli: factory.cli,
		factory,
		options: config.options,
	} as unknown as DiscoveredPlugin;
}

// A design system's contribution: the module whose default export is the page.
const page = plugin("page", {
	label: "Page",
	contributes: [expo.slots.notFoundRoute.contribute(() => "peer/not-found")],
});

// The route file generate would write for an app whose routes directory holds
// `routes`, with the page's plugin present or not.
async function written(
	routes: string[],
	options: ExpoOptions = {},
	withPage = true,
) {
	const cwd = mkdtempSync(join(tmpdir(), "stack-expo-not-found-"));
	mkdirSync(join(cwd, "src/app"), { recursive: true });
	for (const name of routes) writeFileSync(join(cwd, "src/app", name), "");
	const { graph } = buildGraphFromDiscovered({
		discovered: [
			discover(api, api()),
			discover(expo, expo(options)),
			...(withPage ? [discover(page, page())] : []),
		],
		app: { name: "My App", domain: "example.com" },
		cwd,
	});
	return graph.resolve(expo.slots.notFoundFile);
}

test("an app with no route of its own for an unmatched address gets the design system's, a re-export of its page", async () => {
	const file = await written(["index.tsx"]);
	assert.equal(file?.path, "src/app/+not-found.tsx");
	assert.match(
		file?.content ?? "",
		/^export \{ default \} from "peer\/not-found";$/m,
	);
});

test("an app's own route wins, whatever its extension", async () => {
	for (const own of ["+not-found.tsx", "+not-found.jsx", "+not-found.ts"]) {
		assert.equal(await written(["index.tsx", own]), null, own);
	}
});

test("a file that only looks like the route is not the app's own", async () => {
	for (const name of ["not-found.tsx", "+not-found-yet.tsx", "+html.tsx"]) {
		assert.ok(await written([name]), name);
	}
});

test("the page is written under the routes directory the app configures", async () => {
	const file = await written([], { routes: { appDir: "app" } });
	assert.equal(file?.path, "app/+not-found.tsx");
});

test("no page without a design system to draw it, and none with routing off", async () => {
	assert.equal(await written([], {}, false), null);
	assert.equal(await written([], { routes: false }), null);
});

test("only the root of the routes directory is looked at", () => {
	const cwd = mkdtempSync(join(tmpdir(), "stack-expo-not-found-"));
	mkdirSync(join(cwd, "src/app/notes"), { recursive: true });
	writeFileSync(join(cwd, "src/app/notes/+not-found.tsx"), "");
	assert.equal(hasNotFoundRoute(cwd, "src/app"), false);
	assert.equal(hasNotFoundRoute(cwd, "src/missing"), false);
});
