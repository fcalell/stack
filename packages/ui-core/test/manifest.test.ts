import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { uiCoreGuide } from "../src/manifest.ts";

test("every indexed page exists under guide/", () => {
	for (const { page } of uiCoreGuide) {
		const file = new URL(`../guide/${page}.md`, import.meta.url);
		assert.ok(existsSync(file), `guide/${page}.md`);
	}
});

test("every page under guide/ is indexed", () => {
	const indexed = new Set(uiCoreGuide.map((e) => `${e.page}.md`));
	const pages = readdirSync(new URL("../guide/", import.meta.url), {
		recursive: true,
	}).filter((p) => String(p).endsWith(".md"));
	for (const page of pages) assert.ok(indexed.has(String(page)), String(page));
});
