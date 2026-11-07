import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { isListedModule } from "./listed.ts";
import { loadModules } from "./server/modules.ts";

const FILES = ["a.ts", "b.mts", "c.d.ts", "d.test.ts", "index.ts", "e.js"];

test("loadModules and the bundle list the same files", async () => {
	const dir = mkdtempSync(join(tmpdir(), "listed-"));
	try {
		for (const file of FILES) writeFileSync(join(dir, file), "export {};\n");
		const bundled = FILES.filter(isListedModule).map((f) =>
			f.replace(/\.m?ts$/, ""),
		);
		assert.deepEqual(bundled, ["a", "b"]);
		const loaded = await loadModules(pathToFileURL(`${dir}/`));
		assert.deepEqual(Object.keys(loaded), bundled);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
