import { getTableColumns, getTableName, type SQL, sql } from "drizzle-orm";
import {
	integer,
	real,
	type SQLiteColumn,
	type SQLiteTable,
	type SQLiteViewWithSelection,
	sqliteView,
	text,
} from "drizzle-orm/sqlite-core";

// Full-text search over a regular table: an FTS5 virtual table in external-content
// mode (the index holds tokens only; the text stays in the content table), three
// triggers that keep it in sync, and a typed handle to query it through.
//
// Drizzle does not model virtual tables, so the handle is an `.existing()` view:
// drizzle-kit ignores it (no CREATE, no diff, no DROP), while the query builder
// reads it like any selectable. The DDL is plain SQL computed here and carried on
// the handle under a `Symbol.for` key, so `stack db` reads it from the consumer's
// schema without sharing a module instance with it. This module is pure (no node
// imports): the schema file loads it in the Workers bundle too.

export const FTS_KEY = Symbol.for("@fcalell/plugin-db/fts");

export const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

export interface FtsTrigger {
	name: string;
	sql: string;
}

// Everything `stack db` needs to create, sync and migrate one index.
export interface FtsDefinition {
	// The virtual table's name.
	name: string;
	// The content table's name.
	content: string;
	// The indexed columns' names in the content table, in index order.
	columns: string[];
	// The statement that creates the virtual table (no trailing `;`).
	create: string;
	triggers: FtsTrigger[];
	// Identity of the whole definition; a migration carries it as a marker.
	hash: string;
}

export interface FtsTableOptions<
	TContent extends SQLiteTable,
	TColumn extends keyof TContent["_"]["columns"] & string,
> {
	// The regular table whose rows are indexed. It needs an integer primary key
	// (or name `rowid`): the index addresses rows by that integer, and SQLite
	// renumbers the implicit rowid of a table without one on VACUUM.
	content: TContent;
	// The content table's columns to index, by property name.
	columns: readonly [TColumn, ...TColumn[]];
	// Prefix lengths to index for `term*` queries (search-as-you-type), e.g.
	// `[2, 3]`. Each length costs index size and write time; none by default.
	prefix?: readonly number[];
	// FTS5 tokenizer. The default folds case and diacritics ("Beyonce" finds
	// "Beyoncé"); `"porter unicode61 remove_diacritics 2"` adds English stemming and
	// `"trigram"` makes any substring match.
	tokenize?: string;
	// The content table's integer column that addresses its rows in the index.
	// Defaults to its integer primary key.
	rowid?: keyof TContent["_"]["columns"] & string;
}

type FtsColumn<TName extends string, TKey extends string> = SQLiteColumn<{
	name: TKey;
	tableName: TName;
	dataType: "string";
	columnType: "SQLiteText";
	data: string;
	driverParam: string;
	notNull: false;
	hasDefault: false;
	isPrimaryKey: false;
	isAutoincrement: false;
	hasRuntimeDefault: false;
	enumValues: [string, ...string[]];
	baseColumn: never;
	identity: undefined;
	generated: undefined;
}>;

type FtsNumber<TName extends string, TKey extends string> = SQLiteColumn<{
	name: TKey;
	tableName: TName;
	dataType: "number";
	columnType: "SQLiteInteger";
	data: number;
	driverParam: number;
	notNull: true;
	hasDefault: false;
	isPrimaryKey: false;
	isAutoincrement: false;
	hasRuntimeDefault: false;
	enumValues: undefined;
	baseColumn: never;
	identity: undefined;
	generated: undefined;
}>;

// The index as a selectable: the indexed columns by the content table's property
// names, `rowid` (the content row's key, to join on) and `rank` (bm25 with equal
// weights, lower is better).
export type FtsTable<
	TName extends string,
	TColumn extends string,
> = SQLiteViewWithSelection<
	TName,
	true,
	{ [K in TColumn]: FtsColumn<TName, K> } & {
		rowid: FtsNumber<TName, "rowid">;
		rank: SQLiteColumn<{
			name: "rank";
			tableName: TName;
			dataType: "number";
			columnType: "SQLiteReal";
			data: number;
			driverParam: number;
			notNull: true;
			hasDefault: false;
			isPrimaryKey: false;
			isAutoincrement: false;
			hasRuntimeDefault: false;
			enumValues: undefined;
			baseColumn: never;
			identity: undefined;
			generated: undefined;
		}>;
	}
> & { readonly [FTS_KEY]: FtsDefinition };

const q = (name: string): string => `\`${name.replace(/`/g, "``")}\``;
const str = (value: string): string => `'${value.replace(/'/g, "''")}'`;

// FNV-1a: a change detector for a definition, not a security hash.
function fnv1a(input: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return (h >>> 0).toString(16).padStart(8, "0");
}

export function buildFtsDefinition(input: {
	name: string;
	content: string;
	columns: string[];
	rowid: string;
	prefix: readonly number[];
	tokenize: string;
}): FtsDefinition {
	const { name, content, columns, rowid, prefix, tokenize } = input;
	const cols = columns.map(q).join(", ");
	const options = [
		`content=${q(content)}`,
		`content_rowid=${q(rowid)}`,
		...(prefix.length > 0 ? [`prefix=${str(prefix.join(" "))}`] : []),
		`tokenize=${str(tokenize)}`,
	];
	const create = `CREATE VIRTUAL TABLE ${q(name)} USING fts5(${cols}, ${options.join(", ")})`;

	const fresh = (row: "new" | "old") =>
		[`${row}.${q(rowid)}`, ...columns.map((c) => `${row}.${q(c)}`)].join(", ");
	const target = `${q(name)}(${q(name)}, ${q("rowid")}, ${cols})`;
	const add = `INSERT INTO ${q(name)}(${q("rowid")}, ${cols}) VALUES (${fresh("new")});`;
	const remove = `INSERT INTO ${target} VALUES ('delete', ${fresh("old")});`;
	// Only a write to an indexed column re-indexes the row: a play count or a
	// rating on a 50k-row table never touches the index.
	const watched = [rowid, ...columns].map(q).join(", ");

	const triggers: FtsTrigger[] = [
		{
			name: `${name}_ai`,
			sql: `CREATE TRIGGER ${q(`${name}_ai`)} AFTER INSERT ON ${q(content)} BEGIN\n\t${add}\nEND`,
		},
		{
			name: `${name}_ad`,
			sql: `CREATE TRIGGER ${q(`${name}_ad`)} AFTER DELETE ON ${q(content)} BEGIN\n\t${remove}\nEND`,
		},
		{
			name: `${name}_au`,
			sql: `CREATE TRIGGER ${q(`${name}_au`)} AFTER UPDATE OF ${watched} ON ${q(content)} BEGIN\n\t${remove}\n\t${add}\nEND`,
		},
	];

	const hash = fnv1a([create, ...triggers.map((t) => t.sql)].join("\n"));
	return { name, content, columns, create, triggers, hash };
}

// The statements that put a definition in force on a database where the
// content table exists: the table, its triggers, and a rebuild of the index
// from the rows already there.
function creationStatements(def: FtsDefinition): string[] {
	return [
		`${def.create};`,
		...def.triggers.map((t) => `${t.sql};`),
		`INSERT INTO ${q(def.name)}(${q(def.name)}) VALUES ('rebuild');`,
	];
}

const dropTriggers = (def: Pick<FtsDefinition, "name">): string[] =>
	["ai", "ad", "au"].map(
		(s) => `DROP TRIGGER IF EXISTS ${q(`${def.name}_${s}`)};`,
	);

export const ftsMarker = (def: Pick<FtsDefinition, "name" | "hash">): string =>
	`-- stack:fts ${def.name} ${def.hash}`;

export const ftsDropMarker = (name: string): string =>
	`-- stack:fts-drop ${name}`;

const join = (statements: string[]): string =>
	`${statements.join(`\n${STATEMENT_BREAKPOINT}\n`)}\n`;

// A migration that creates the index, or replaces the one a changed
// declaration supersedes.
export function ftsMigrationSql(
	def: FtsDefinition,
	{ replace }: { replace: boolean },
): string {
	const head = replace
		? [...dropTriggers(def), `DROP TABLE IF EXISTS ${q(def.name)};`]
		: [];
	return `${ftsMarker(def)}\n${join([...head, ...creationStatements(def)])}`;
}

export function ftsDropMigrationSql(name: string): string {
	return `${ftsDropMarker(name)}\n${join([
		...dropTriggers({ name }),
		`DROP TABLE IF EXISTS ${q(name)};`,
	])}`;
}

// Appended to a generated migration that recreates the content table (SQLite
// alters a table by copying it: the triggers go with the old table and the
// copied rows may take new rowids), so the index follows the new table.
export function ftsResyncSql(def: FtsDefinition): string {
	return join([
		...dropTriggers(def),
		...def.triggers.map((t) => `${t.sql};`),
		`INSERT INTO ${q(def.name)}(${q(def.name)}) VALUES ('rebuild');`,
	]);
}

// Statements for a live database, run in one transaction: the idempotent
// converge `stack dev` runs after each push. `state` is what the database holds.
export function ftsConvergeStatements(
	def: FtsDefinition,
	state: { table: string | null; triggers: Map<string, string> },
): string[] {
	const tableOk = state.table === def.create;
	const triggersOk = def.triggers.every(
		(t) => state.triggers.get(t.name) === t.sql,
	);
	if (tableOk && triggersOk) return [];
	if (tableOk) {
		return [
			...dropTriggers(def),
			...def.triggers.map((t) => `${t.sql};`),
			`INSERT INTO ${q(def.name)}(${q(def.name)}) VALUES ('rebuild');`,
		];
	}
	return [
		...dropTriggers(def),
		`DROP TABLE IF EXISTS ${q(def.name)};`,
		...creationStatements(def),
	];
}

// The tables SQLite keeps behind an FTS5 table.
export const ftsShadowTables = (name: string): string[] =>
	["data", "idx", "docsize", "config", "content"].map((s) => `${name}_${s}`);

export const dropFtsStatements = (name: string): string[] => [
	...dropTriggers({ name }),
	`DROP TABLE IF EXISTS ${q(name)};`,
];

function rowidColumn(
	content: SQLiteTable,
	columns: Record<string, SQLiteColumn>,
	explicit: string | undefined,
): string {
	const table = getTableName(content);
	if (explicit !== undefined) {
		const column = columns[explicit];
		if (!column) {
			throw new Error(`ftsTable: "${table}" has no column "${explicit}"`);
		}
		return column.name;
	}
	const keys = Object.values(columns).filter(
		(c) => c.primary && c.dataType === "number",
	);
	const [only] = keys;
	if (keys.length !== 1 || !only) {
		throw new Error(
			`ftsTable: "${table}" needs a single integer primary key to address rows in the index (SQLite renumbers the implicit rowid of other tables on VACUUM, which would orphan the index). Add \`id: integer("id").primaryKey()\`, or name an integer unique column with \`rowid\`.`,
		);
	}
	return only.name;
}

// Declares a full-text index over `content`:
//
//   export const taskSearch = ftsTable("task_search", {
//     content: tasks,
//     columns: ["title", "owner", "notes"],
//     prefix: [2, 3],
//   });
//
// `stack db generate` writes its DDL as a migration, `stack dev` and
// `stack db push` apply it, and `match` / `bm25` query it.
export function ftsTable<
	const TName extends string,
	TContent extends SQLiteTable,
	TColumn extends keyof TContent["_"]["columns"] & string,
>(
	name: TName,
	options: FtsTableOptions<TContent, TColumn>,
): FtsTable<TName, TColumn> {
	const contentColumns = getTableColumns(options.content) as Record<
		string,
		SQLiteColumn
	>;
	const dbNames: string[] = [];
	for (const key of options.columns) {
		const column = contentColumns[key];
		if (!column) {
			throw new Error(
				`ftsTable "${name}": "${getTableName(options.content)}" has no column "${key}"`,
			);
		}
		dbNames.push(column.name);
	}
	for (const length of options.prefix ?? []) {
		if (!Number.isInteger(length) || length < 1) {
			throw new Error(
				`ftsTable "${name}": a prefix length is a positive integer, got ${length}`,
			);
		}
	}

	const definition = buildFtsDefinition({
		name,
		content: getTableName(options.content),
		columns: dbNames,
		rowid: rowidColumn(options.content, contentColumns, options.rowid),
		prefix: options.prefix ?? [],
		tokenize: options.tokenize ?? "unicode61 remove_diacritics 2",
	});

	const selection: Record<string, unknown> = {};
	options.columns.forEach((key, i) => {
		selection[key] = text(dbNames[i] as string);
	});
	selection.rowid = integer("rowid").notNull();
	selection.rank = real("rank").notNull();

	const view = sqliteView(
		name,
		selection as Record<string, never>,
	).existing() as unknown as FtsTable<TName, TColumn>;
	Object.defineProperty(view, FTS_KEY, { value: definition });
	return view;
}

// `fts MATCH query`, the condition that selects the rows a query finds. The
// query is FTS5 syntax: pass user-typed text through `ftsQuery` first.
export function match(
	fts: { readonly [FTS_KEY]: FtsDefinition },
	query: string,
) {
	return sql`${sql.identifier(fts[FTS_KEY].name)} MATCH ${query}`;
}

// The relevance score, lower is better: `orderBy(bm25(taskSearch))`. Weights
// per column (default 1) rank a hit in a title above one in an notes:
// `bm25(taskSearch, { title: 10, owner: 5 })`.
export function bm25<TName extends string, TColumn extends string>(
	fts: FtsTable<TName, TColumn>,
	weights?: Partial<Record<TColumn, number>>,
): SQL<number> {
	const def = fts[FTS_KEY];
	const name = sql.identifier(def.name);
	if (!weights) return sql<number>`bm25(${name})`;
	const view = fts as unknown as Record<string, SQLiteColumn>;
	const values = Object.keys(weights).map((key) => {
		const column = view[key];
		if (!column) throw new Error(`bm25: "${def.name}" has no column "${key}"`);
		return [
			column.name,
			(weights as Record<string, number>)[key] ?? 1,
		] as const;
	});
	const byName = new Map(values);
	const list = def.columns.map((c) => byName.get(c) ?? 1);
	return sql<number>`bm25(${name}, ${sql.join(
		list.map((w) => sql.raw(String(Number(w)))),
		sql.raw(", "),
	)})`;
}

// The matched text of one column with each hit wrapped in `open` and `close`.
export function highlight<TName extends string, TColumn extends string>(
	fts: FtsTable<TName, TColumn>,
	column: TColumn,
	open: string,
	close: string,
): SQL<string> {
	const def = fts[FTS_KEY];
	const index = def.columns.indexOf(
		((fts as unknown as Record<string, SQLiteColumn>)[column] as SQLiteColumn)
			.name,
	);
	return sql<string>`highlight(${sql.identifier(def.name)}, ${sql.raw(String(index))}, ${open}, ${close})`;
}

// Turns what a person typed into an FTS5 query that cannot be a syntax error:
// every word must appear, and with `prefix` (the default) the last may be
// unfinished, so "daft pu" finds "Daft Punk". `null` when nothing searchable
// was typed, since FTS5 refuses an empty query.
export function ftsQuery(
	input: string,
	{ prefix = true }: { prefix?: boolean } = {},
): string | null {
	const words = input.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
	if (words.length === 0) return null;
	return words
		.map((w, i) => `"${w}"${prefix && i === words.length - 1 ? "*" : ""}`)
		.join(" ");
}
