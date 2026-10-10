import assert from "node:assert/strict";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { drizzleKitBin } from "../src/node/drizzle-kit.ts";
import { detectSchemaDrift } from "../src/node/migration-safety.ts";
import { generateMigrations, pushSchemaLocal } from "../src/node/push.ts";
import { MIGRATIONS_TABLE } from "../src/node/wrangler.ts";
import type { DbOptions } from "../src/types.ts";

// The schema builds its tables from plugin-db's own `orm.ts` by absolute
// path, so the directory holds a schema and nothing else: no manifest, no
// node_modules, no drizzle-kit, no drizzle-orm.
const ORM = fileURLToPath(new URL("../src/orm.ts", import.meta.url));
const options: DbOptions = { dialect: "sqlite", path: "./.db-kit/local.db" };

function consumer(schema: string): string {
	const dir = mkdtempSync(join(tmpdir(), "stack-drizzle-kit-"));
	mkdirSync(join(dir, "src/schema"), { recursive: true });
	writeFileSync(join(dir, "src/schema/index.ts"), schema, "utf-8");
	return dir;
}

function sqlFiles(dir: string): string[] {
	const migrations = join(dir, "src/migrations");
	if (!existsSync(migrations)) return [];
	return readdirSync(migrations).filter((f) => f.endsWith(".sql"));
}

const dir =
	consumer(`import { integer, sqliteTable, text } from ${JSON.stringify(ORM)};

export const note = sqliteTable("note", {
	id: integer("id").primaryKey(),
	body: text("body").notNull(),
});
`);

after(() => {
	rmSync(dir, { recursive: true, force: true });
});

test("generate writes one migration for a directory with no node_modules", async () => {
	assert.equal(existsSync(join(dir, "node_modules")), false);

	const created = await generateMigrations(dir, options);

	assert.equal(created.length, 1);
	const files = sqlFiles(dir);
	assert.equal(files.length, 1);
	assert.match(
		readFileSync(join(dir, "src/migrations", files[0] ?? ""), "utf-8"),
		/CREATE TABLE/,
	);
	const config = readFileSync(
		join(dir, ".db-kit/drizzle-generate.config.ts"),
		"utf-8",
	);
	assert.doesNotMatch(config, /import/);
});

test("a second generate over an unchanged schema writes nothing and the drift gate answers false", async () => {
	const created = await generateMigrations(dir, options);

	assert.deepEqual(created, []);
	assert.equal(sqlFiles(dir).length, 1);
	assert.equal(detectSchemaDrift(dir, options), false);
});

test("a schema edited after generate is drift", () => {
	const schema = join(dir, "src/schema/index.ts");
	const body = `	body: text("body").notNull(),\n`;
	writeFileSync(
		schema,
		readFileSync(schema, "utf-8").replace(
			body,
			`${body}	title: text("title"),\n`,
		),
		"utf-8",
	);

	assert.equal(detectSchemaDrift(dir, options), true);
	assert.equal(sqlFiles(dir).length, 1);
	assert.equal(existsSync(join(dir, ".db-kit/drift")), false);
});

test("a push leaves the migrations table `stack db apply` records into", async () => {
	const pushed =
		consumer(`import { integer, sqliteTable, text } from ${JSON.stringify(ORM)};

export const note = sqliteTable("note", {
	id: integer("id").primaryKey(),
	body: text("body").notNull(),
});
`);
	const Database = createRequire(drizzleKitBin())("better-sqlite3");
	const path = join(pushed, ".db-kit/local.db");
	mkdirSync(join(pushed, ".db-kit"), { recursive: true });
	const before = new Database(path);
	before.exec(
		`CREATE TABLE ${MIGRATIONS_TABLE} (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE); INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ('0000_init.sql');`,
	);
	before.close();

	await pushSchemaLocal(pushed, options);

	const after = new Database(path, { readonly: true });
	const tables = after
		.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
		.all()
		.map((row: { name: string }) => row.name);
	const recorded = after
		.prepare(`SELECT count(*) AS n FROM ${MIGRATIONS_TABLE}`)
		.get() as { n: number };
	after.close();
	rmSync(pushed, { recursive: true, force: true });

	assert.ok(tables.includes("note"), "the schema is pushed");
	assert.equal(recorded.n, 1);
});
