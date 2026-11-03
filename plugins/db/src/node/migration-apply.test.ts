import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { formatFailedMigration } from "./migration-safety.ts";

function project(files: Record<string, string>): string {
	const cwd = mkdtempSync(join(tmpdir(), "apply-"));
	const dir = join(cwd, "src", "migrations");
	mkdirSync(join(dir, "meta"), { recursive: true });
	for (const [name, sql] of Object.entries(files))
		writeFileSync(join(dir, name), sql);
	return cwd;
}

const options = { dialect: "sqlite", path: "./x.db" } as const;

test("migrations that build an empty database pass", () => {
	const cwd = project({
		"0000_a.sql":
			'CREATE TABLE `t` (`id` text);--> statement-breakpoint\nCREATE INDEX `i` ON `t` ("id" collate nocase);',
	});
	try {
		assert.equal(formatFailedMigration(cwd, options), null);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});

test("a migration that fails to apply is named", () => {
	const cwd = project({
		"0000_a.sql": "CREATE TABLE `t` (`id` text);",
		"0001_b.sql": 'CREATE INDEX `i` ON `t` (`"id" collate nocase`);',
	});
	try {
		const failed = formatFailedMigration(cwd, options);
		assert.match(failed ?? "", /0001_b\.sql fails to apply/);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});
