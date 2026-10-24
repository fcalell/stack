import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { configUrl, loadConfig } from "./config.ts";

const source = (name: string) =>
	`export default { name: ${JSON.stringify(name)}, plugins: [], validate() { return []; } };`;

test("configUrl is a file URL, and a reload gets a fresh one each time", () => {
	assert.match(configUrl("stack.config.ts"), /^file:\/\//);
	assert.notEqual(configUrl("a.ts", true), configUrl("a.ts", true));
	assert.equal(configUrl("a.ts"), configUrl("a.ts"));
});

test("a reload sees the edited file, a plain load the cached module", async () => {
	const dir = mkdtempSync(join(tmpdir(), "stack-config-"));
	try {
		const file = join(dir, "stack.config.mjs");
		writeFileSync(file, source("one"));
		const first = (await loadConfig(file)) as unknown as { name: string };
		assert.equal(first.name, "one");
		writeFileSync(file, source("two"));
		const cached = (await loadConfig(file)) as unknown as { name: string };
		assert.equal(cached.name, "one");
		const fresh = (await loadConfig(file, { reload: true })) as unknown as {
			name: string;
		};
		assert.equal(fresh.name, "two");
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
