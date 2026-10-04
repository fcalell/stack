import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadInstalledPlugins } from "../src/lib/discovery.ts";

// Links a stand-in first-party plugin into the app's `node_modules`, as a
// workspace install does.
function install(app: string, name: string): void {
	const dir = join(app, "..", `plugin-${name}`);
	mkdirSync(join(dir, "dist"), { recursive: true });
	writeFileSync(
		join(dir, "package.json"),
		JSON.stringify({
			name: `@fcalell/plugin-${name}`,
			type: "module",
			exports: { ".": "./dist/index.js" },
		}),
	);
	writeFileSync(
		join(dir, "dist/index.js"),
		`export const ${name} = { cli: { requires: [] } };`,
	);
	mkdirSync(join(app, "node_modules/@fcalell"), { recursive: true });
	symlinkSync(dir, join(app, "node_modules/@fcalell", `plugin-${name}`));
}

test("a plugin installed after an earlier load still loads", async () => {
	const app = join(mkdtempSync(join(tmpdir(), "stack-")), "app");
	mkdirSync(app);
	writeFileSync(join(app, "package.json"), "{}");
	install(app, "cloudflare");
	const original = process.cwd();
	process.chdir(app);
	try {
		const first = await loadInstalledPlugins(["cloudflare"]);
		assert.deepEqual(
			first.map((p) => p.name),
			["cloudflare"],
		);
		install(app, "db");
		const second = await loadInstalledPlugins(["cloudflare", "db"]);
		assert.deepEqual(
			second.map((p) => p.name),
			["cloudflare", "db"],
		);
	} finally {
		process.chdir(original);
	}
});
