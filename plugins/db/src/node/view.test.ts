import assert from "node:assert/strict";
import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { generateMigrations } from "./push.ts";

const orm = dirname(
	createRequire(import.meta.url).resolve("drizzle-orm/version"),
);
// The package itself, so a schema imports `@fcalell/plugin-db/orm` as a
// consumer does (its `dist`, which `pnpm build` writes).
const self = join(import.meta.dirname, "..", "..");

function consumer(schema: string): string {
	const cwd = mkdtempSync(join(tmpdir(), "stack-view-"));
	mkdirSync(join(cwd, "src", "schema"), { recursive: true });
	mkdirSync(join(cwd, "node_modules"), { recursive: true });
	symlinkSync(orm, join(cwd, "node_modules", "drizzle-orm"), "dir");
	mkdirSync(join(cwd, "node_modules", "@fcalell"), { recursive: true });
	symlinkSync(self, join(cwd, "node_modules", "@fcalell", "plugin-db"), "dir");
	writeFileSync(join(cwd, "package.json"), '{"type":"module"}');
	writeFileSync(join(cwd, "src", "schema", "index.ts"), schema);
	return cwd;
}

const TABLE = `import { integer, sql, sqliteTable, sqliteView, text } from "@fcalell/plugin-db/orm";
export const playlists = sqliteTable("playlists", { id: text("id").primaryKey(), parent: text("parent"), n: integer("n") });
`;

test("a view from a query builder generates a migration", async () => {
	const cwd = consumer(`${TABLE}
export const roots = sqliteView("roots").as((qb) => qb.select().from(playlists));
`);
	try {
		const [m] = await generateMigrations(cwd, { dialect: "sqlite" });
		assert.match(m?.sql ?? "", /CREATE VIEW `roots`/);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});

test("a view with columns and a sql body generates a migration", async () => {
	const cwd = consumer(`${TABLE}
export const counts = sqliteView("counts", { id: text("id"), n: integer("n") }).as(sql\`select id, n from playlists\`);
`);
	try {
		const [m] = await generateMigrations(cwd, { dialect: "sqlite" });
		assert.match(m?.sql ?? "", /CREATE VIEW `counts`/);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});

test("a view with columns and a query builder body generates a migration", async () => {
	const cwd = consumer(`${TABLE}
export const counts = sqliteView("counts", { id: text("id"), n: integer("n") }).as((qb) => qb.select().from(playlists));
`);
	try {
		const [m] = await generateMigrations(cwd, { dialect: "sqlite" });
		assert.match(m?.sql ?? "", /CREATE VIEW `counts`/);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});
