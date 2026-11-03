import assert from "node:assert/strict";
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { generateMigrations } from "./push.ts";

// drizzle-orm's root, beside its `version` entry.
const orm = dirname(
	createRequire(import.meta.url).resolve("drizzle-orm/version"),
);

function consumer(): string {
	const cwd = mkdtempSync(join(tmpdir(), "stack-generate-"));
	mkdirSync(join(cwd, "src", "schema"), { recursive: true });
	mkdirSync(join(cwd, "node_modules"), { recursive: true });
	symlinkSync(orm, join(cwd, "node_modules", "drizzle-orm"), "dir");
	writeFileSync(join(cwd, "package.json"), '{"type":"module"}');
	return cwd;
}

const schema = (columns: string) =>
	`import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const tracks = sqliteTable("tracks", { id: text("id").primaryKey(), ${columns} });
`;

const write = (cwd: string, columns: string) =>
	writeFileSync(join(cwd, "src", "schema", "index.ts"), schema(columns));

test("a table that adds and drops a column generates an add and a drop", async () => {
	const cwd = consumer();
	try {
		write(cwd, 'old: text("old")');
		await generateMigrations(cwd, { dialect: "sqlite" });
		write(cwd, 'fresh: text("fresh")');
		const [migration] = await generateMigrations(cwd, { dialect: "sqlite" });
		assert.ok(migration, "a migration is written, not 'no changes'");
		assert.match(migration.sql, /ADD `fresh`/);
		assert.match(migration.sql, /DROP COLUMN `old`/);
		assert.doesNotMatch(migration.sql, /RENAME/);
		assert.equal(
			readdirSync(join(cwd, "src", "migrations")).filter((f) =>
				f.endsWith(".sql"),
			).length,
			2,
		);
		assert.ok(readFileSync(join(cwd, "src", "migrations", migration.name)));
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});

test("a drizzle-kit failure is thrown, not read as no changes", async () => {
	const cwd = consumer();
	try {
		writeFileSync(join(cwd, "src", "schema", "index.ts"), "export const x = ;");
		await assert.rejects(
			generateMigrations(cwd, { dialect: "sqlite" }),
			/Unexpected/,
		);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});
