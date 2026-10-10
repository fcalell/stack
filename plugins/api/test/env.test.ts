import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "../src/index.ts";

test("api alone bakes createWorker with no type argument", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "stack-api-env-"));
	mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });
	writeFileSync(
		join(cwd, "src/worker/routes/hello.ts"),
		"export const hello = {};\n",
	);
	const { graph } = buildGraphFromDiscovered({
		discovered: [
			{
				name: "api",
				cli: api.cli,
				factory: api,
				options: api({}).options,
			} as unknown as DiscoveredPlugin,
		],
		app: { name: "env", domain: "example.com" },
		cwd,
	});
	assert.equal(await graph.resolve(api.slots.envType), null);
	const base = await graph.resolve(api.slots.workerBase);
	assert.equal(base.kind, "call");
	assert.equal("typeArgs" in base, false);
});
