import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { DbOptions } from "../types";
import {
	assertNoUnacknowledgedDrops,
	detectLatestDrops,
	hasDrops,
} from "./migration-safety";

// Minimal drizzle snapshot: only the `tables`/`columns`/`views` keys the diff
// reads (real snapshots carry far more, which the gate ignores by design).
type Cols = Record<string, unknown>;
interface Snap {
	tables: Record<string, { name: string; columns: Cols }>;
	views?: Record<string, unknown>;
}

function table(name: string, columns: string[]): Snap["tables"][string] {
	const cols: Cols = {};
	for (const c of columns) cols[c] = { name: c };
	return { name, columns: cols };
}

const d1: DbOptions = { dialect: "d1", databaseId: "x", migrations: "./m" };

const scratch: string[] = [];
afterEach(() => {
	while (scratch.length) {
		const d = scratch.pop();
		if (d) rmSync(d, { recursive: true, force: true });
	}
});

// Writes a real drizzle migrations dir: a `_journal.json`, one snapshot per
// entry, and the newest migration's `.sql`. `snapshots[i]` maps to journal
// entry `i` (tag `000i_change`); the last is the "newest" the gate examines.
function makeMigrations(snapshots: Snap[], newestSql = ""): string {
	const cwd = mkdtempSync(join(tmpdir(), "mig-safety-"));
	scratch.push(cwd);
	const migrations = join(cwd, "m");
	const meta = join(migrations, "meta");
	mkdirSync(meta, { recursive: true });

	const entries = snapshots.map((snap, idx) => {
		const idx4 = String(idx).padStart(4, "0");
		const tag = `${idx4}_change`;
		writeFileSync(join(meta, `${idx4}_snapshot.json`), JSON.stringify(snap));
		writeFileSync(
			join(migrations, `${tag}.sql`),
			idx === snapshots.length - 1 ? newestSql : "",
		);
		return { idx, version: "6", when: 0, tag, breakpoints: true };
	});
	writeFileSync(
		join(meta, "_journal.json"),
		JSON.stringify({ version: "7", dialect: "sqlite", entries }),
	);
	return cwd;
}

describe("destructive-migration gate", () => {
	it("passes a benign additive change (new column) — not a drop", () => {
		const cwd = makeMigrations([
			{ tables: { users: table("users", ["id", "email"]) } },
			{ tables: { users: table("users", ["id", "email", "name"]) } },
		]);
		const result = detectLatestDrops(cwd, d1);
		expect(result && hasDrops(result.report)).toBe(false);
		expect(() => assertNoUnacknowledgedDrops(cwd, d1)).not.toThrow();
	});

	it("flags a dropped column and throws unacknowledged", () => {
		const cwd = makeMigrations([
			{ tables: { users: table("users", ["id", "email", "name"]) } },
			{ tables: { users: table("users", ["id", "email"]) } },
		]);
		const result = detectLatestDrops(cwd, d1);
		expect(result?.report.columns).toEqual([
			{ table: "users", column: "name" },
		]);
		expect(() => assertNoUnacknowledgedDrops(cwd, d1)).toThrow(/name/);
	});

	it("flags a dropped table (and does not also list its columns)", () => {
		const cwd = makeMigrations([
			{
				tables: {
					users: table("users", ["id"]),
					posts: table("posts", ["id", "body"]),
				},
			},
			{ tables: { users: table("users", ["id"]) } },
		]);
		const result = detectLatestDrops(cwd, d1);
		expect(result?.report.tables).toEqual(["posts"]);
		expect(result?.report.columns).toEqual([]);
		expect(() => assertNoUnacknowledgedDrops(cwd, d1)).toThrow(/posts/);
	});

	it("flags a dropped view", () => {
		const cwd = makeMigrations([
			{ tables: {}, views: { active_users: {} } },
			{ tables: {}, views: {} },
		]);
		expect(detectLatestDrops(cwd, d1)?.report.views).toEqual(["active_users"]);
		expect(() => assertNoUnacknowledgedDrops(cwd, d1)).toThrow(/active_users/);
	});

	it("passes an acknowledged drop (-- stack:allow-destructive marker)", () => {
		const cwd = makeMigrations(
			[
				{ tables: { users: table("users", ["id", "email"]) } },
				{ tables: { users: table("users", ["id"]) } },
			],
			"-- stack:allow-destructive\nALTER TABLE users DROP COLUMN email;",
		);
		const result = detectLatestDrops(cwd, d1);
		expect(
			hasDrops(result?.report ?? { tables: [], columns: [], views: [] }),
		).toBe(true);
		expect(result?.acknowledged).toBe(true);
		expect(() => assertNoUnacknowledgedDrops(cwd, d1)).not.toThrow();
	});

	it("treats the first migration as all-additions (no predecessor)", () => {
		const cwd = makeMigrations([
			{ tables: { users: table("users", ["id", "email"]) } },
		]);
		expect(detectLatestDrops(cwd, d1)?.report).toEqual({
			tables: [],
			columns: [],
			views: [],
		});
		expect(() => assertNoUnacknowledgedDrops(cwd, d1)).not.toThrow();
	});

	it("returns null and never throws when there are no migrations", () => {
		const cwd = mkdtempSync(join(tmpdir(), "mig-safety-empty-"));
		scratch.push(cwd);
		expect(detectLatestDrops(cwd, d1)).toBeNull();
		expect(() => assertNoUnacknowledgedDrops(cwd, d1)).not.toThrow();
	});
});
