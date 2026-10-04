import type { DatabaseSync, SQLInputValue } from "node:sqlite";

// The test boot's D1: an in-memory node:sqlite database behind the D1
// binding's statement surface (prepare, bind, run, all, raw, first, batch),
// each call answering as D1 answers. It runs in the test's own process, so
// no call crosses a socket or blocks on another thread. Node-only.

export interface D1Meta {
	changes: number;
	last_row_id: number;
	changed_db: boolean;
	duration: number;
	rows_read: number;
	rows_written: number;
	size_after: number;
}

export interface D1Result {
	success: true;
	meta: D1Meta;
	results: Record<string, unknown>[];
}

export interface TestD1Statement {
	bind(...values: unknown[]): TestD1Statement;
	first(column?: string): Promise<unknown>;
	run(): Promise<D1Result>;
	all(): Promise<D1Result>;
	raw(): Promise<unknown[][]>;
}

export interface TestD1 {
	prepare(query: string): TestD1Statement;
	batch(statements: TestD1Statement[]): Promise<D1Result[]>;
}

// The values D1 binds: a boolean as 1 or 0, bytes as a blob; anything else
// D1 refuses.
function input(value: unknown): SQLInputValue {
	if (
		value === null ||
		typeof value === "number" ||
		typeof value === "bigint" ||
		typeof value === "string"
	)
		return value;
	if (typeof value === "boolean") return value ? 1 : 0;
	if (ArrayBuffer.isView(value))
		return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
	if (value instanceof ArrayBuffer) return new Uint8Array(value);
	throw new TypeError(
		`D1_TYPE_ERROR: Type '${typeof value}' not supported for value '${String(value)}'`,
	);
}

// A row as D1 hands it over: a plain object, a blob as an array of bytes.
function output(row: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(row).map(([column, value]) => [
			column,
			value instanceof Uint8Array ? Array.from(value) : value,
		]),
	);
}

// Runs `apply` in one transaction, rolled back whole when it throws.
export function transaction<T>(db: DatabaseSync, apply: () => T): T {
	db.exec("BEGIN");
	try {
		const result = apply();
		db.exec("COMMIT");
		return result;
	} catch (error) {
		db.exec("ROLLBACK");
		throw error;
	}
}

export function testD1(db: DatabaseSync): TestD1 {
	const changes = () =>
		Number(db.prepare("SELECT total_changes() AS n").get()?.n ?? 0);
	const execute = (query: string, params: SQLInputValue[]): D1Result => {
		const before = changes();
		const rows = db.prepare(query).all(...params);
		const changed = changes() - before;
		const lastRowId = db.prepare("SELECT last_insert_rowid() AS id").get()?.id;
		return {
			success: true,
			meta: {
				changes: changed,
				last_row_id: Number(lastRowId ?? 0),
				changed_db: changed > 0,
				duration: 0,
				rows_read: rows.length,
				rows_written: changed,
				size_after: 0,
			},
			results: rows.map(output),
		};
	};
	// A statement this database prepared, by how a batch runs it.
	const executes = new WeakMap<TestD1Statement, () => D1Result>();
	const statement = (
		query: string,
		params: SQLInputValue[],
	): TestD1Statement => {
		const prepared: TestD1Statement = {
			bind: (...values) => statement(query, values.map(input)),
			first: async (column) => {
				const row = execute(query, params).results[0];
				if (row === undefined) return null;
				return column === undefined ? row : (row[column] ?? null);
			},
			run: async () => execute(query, params),
			all: async () => execute(query, params),
			raw: async () => {
				const prepared = db.prepare(query);
				prepared.setReturnArrays(true);
				// `setReturnArrays` makes each row an array of its column values.
				const rows = prepared.all(...params) as unknown as unknown[][];
				return rows.map((row) =>
					row.map((value) =>
						value instanceof Uint8Array ? Array.from(value) : value,
					),
				);
			},
		};
		executes.set(prepared, () => execute(query, params));
		return prepared;
	};
	return {
		prepare: (query) => statement(query, []),
		// D1 runs a batch as one transaction.
		batch: async (statements) =>
			transaction(db, () =>
				statements.map((each) => {
					const run = executes.get(each);
					if (!run) {
						throw new TypeError(
							"D1_TYPE_ERROR: a batch takes statements this database prepared",
						);
					}
					return run();
				}),
			),
	};
}
