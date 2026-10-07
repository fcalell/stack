import assert from "node:assert/strict";
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { generate } from "../src/commands/generate.ts";
import { buildGraphFromConfig } from "../src/lib/build-graph.ts";
import { createCommandContext } from "../src/lib/command-context.ts";
import { loadConfig } from "../src/lib/config.ts";
import { GUIDE_PATH } from "../src/lib/guide.ts";

// An app with no plugin: the CLI's own artifact, the guide index, is the one
// file `generate` writes.
function app(): { dir: string; configPath: string } {
	const dir = mkdtempSync(join(tmpdir(), "stack-ctx-"));
	const configPath = join(dir, "stack.config.ts");
	writeFileSync(
		configPath,
		`export default {
	app: { name: "app", domain: "example.com" },
	plugins: [],
	validate: () => ({ valid: true, errors: [] }),
};
`,
	);
	return { dir, configPath };
}

async function contextFor(dir: string, configPath: string) {
	const config = await loadConfig(configPath);
	const { graph } = await buildGraphFromConfig({ config, cwd: dir });
	return createCommandContext({ options: {}, cwd: dir, graph, configPath });
}

test("a command's generate writes the files `stack generate` writes", async () => {
	const a = app();
	const b = app();
	try {
		await generate(a.configPath, a.dir);
		const ctx = await contextFor(b.dir, b.configPath);
		assert.equal(existsSync(join(b.dir, GUIDE_PATH)), false);
		await ctx.generate();
		assert.equal(
			readFileSync(join(b.dir, GUIDE_PATH), "utf-8"),
			readFileSync(join(a.dir, GUIDE_PATH), "utf-8"),
		);
	} finally {
		rmSync(a.dir, { recursive: true, force: true });
		rmSync(b.dir, { recursive: true, force: true });
	}
});

test("a command's generate writes under the command's cwd, not the process's", async () => {
	const a = app();
	try {
		const ctx = await contextFor(a.dir, a.configPath);
		assert.notEqual(process.cwd(), a.dir);
		await ctx.generate();
		assert.ok(existsSync(join(a.dir, GUIDE_PATH)));
		assert.equal(existsSync(join(process.cwd(), GUIDE_PATH)), false);
	} finally {
		rmSync(a.dir, { recursive: true, force: true });
	}
});
