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
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { drizzleKitBin } from "../src/node/drizzle-kit.ts";
import { detectSchemaDrift } from "../src/node/migration-safety.ts";
import { generateMigrations } from "../src/node/push.ts";
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

test("the binary resolves from plugin-db's install", () => {
	const bin = drizzleKitBin();

	assert.equal(existsSync(bin), true);
	assert.ok(bin.endsWith(`${sep}bin.cjs`));
	assert.ok(bin.split(sep).includes("drizzle-kit"));
	assert.ok(relative(dir, bin).startsWith(".."));
});
