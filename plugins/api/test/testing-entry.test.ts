import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "../src/index.ts";
import type { TestEntry } from "../src/testing/index.ts";
import type { AppRouter } from "./fixtures/testing/worker.ts";

// Its own file, so its process holds one `virtual:stack-procedure` target.

const DEV_SECRET = "rendered-secret-0123456789";
const rendered = new URL("./fixtures/testing/testing.ts", import.meta.url);

// The rendered file imports the package's `./testing` export, whose `dist`
// turbo does not build before this package's own tests. Served from source,
// the URL every other test imports, so it is one module instance.
const runtime = new URL("../src/testing/index.ts", import.meta.url).href;
registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === "@fcalell/plugin-api/testing") {
			return nextResolve(runtime, context);
		}
		return nextResolve(specifier, context);
	},
});

after(() => rmSync(fileURLToPath(rendered), { force: true }));

test("the rendered entry boots the worker it names", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "stack-api-testing-entry-"));
	mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });
	writeFileSync(
		join(cwd, "src/worker/routes/hello.ts"),
		"export const hello = {};\n",
	);
	const config = api({
		env: [
			{
				name: "FIXTURE_SECRET",
				devDefault: DEV_SECRET,
				validate: { minLength: 16 },
			},
		],
	});
	const { graph } = buildGraphFromDiscovered({
		discovered: [
			{
				name: config.__plugin,
				cli: api.cli,
				factory: api,
				options: config.options,
			} as unknown as DiscoveredPlugin,
		],
		app: { name: "testing", domain: "example.com" },
		cwd,
	});
	const source = await graph.resolve(api.slots.testingSource);
	assert.ok(source);
	writeFileSync(rendered, source);

	const { testing } = (await import(rendered.href)) as {
		testing: TestEntry<AppRouter, object>;
	};
	await using app = await testing.boot();
	assert.equal(await app.client().hello.secret(), DEV_SECRET);
});
