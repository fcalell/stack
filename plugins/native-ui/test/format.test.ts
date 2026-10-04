import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const SRC = join(import.meta.dirname, "../src");

test("every formatter comes from ui-core's formatterFor, none built in place", () => {
	const built = readdirSync(SRC, { recursive: true, encoding: "utf8" })
		.filter((file) => /\.tsx?$/.test(file))
		.filter((file) =>
			readFileSync(join(SRC, file), "utf8").includes("new Intl."),
		);
	assert.deepEqual(built, []);
});
