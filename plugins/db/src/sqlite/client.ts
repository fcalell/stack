import Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const cache = new Map<string, unknown>();

// How often a long-running process lets SQLite refresh its query-planner
// statistics (`PRAGMA optimize` is cheap when nothing changed).
const OPTIMIZE_EVERY_MS = 2 * 60 * 60 * 1000;

// The connection settings for a server that owns its database file. They are
// the defaults, not options: each is safe for every app, and none has a value
// an app would pick differently.
//
// - journal_mode=WAL: readers never block the writer and the writer never
//   blocks readers; writes append to a log instead of rewriting pages. Persists
//   in the file.
// - synchronous=NORMAL: with WAL, durable across an application crash and, at
//   worst, loses the last commits on power loss, never corrupts. FULL (the
//   default) fsyncs every commit for a guarantee WAL does not need.
// - busy_timeout=5000: a writer waits up to 5 s for the lock instead of failing
//   with SQLITE_BUSY while a second process (a migration, a seed) holds it.
// - foreign_keys=ON: SQLite ignores foreign keys unless asked, per connection.
// - cache_size=-65536: 64 MiB of page cache (negative is KiB) against the 2 MiB
//   default, so a library of tens of thousands of rows stays in memory.
// - mmap_size=256 MiB: reads come straight from the OS page cache, skipping a
//   copy per page. Address space only; the OS pages it in on demand.
// - temp_store=MEMORY: sorts, GROUP BY and temporary indexes stay off the disk.
// - journal_size_limit=64 MiB: the WAL file shrinks back after a checkpoint
//   instead of keeping its peak size.
const PRAGMAS = [
	"journal_mode = WAL",
	"synchronous = NORMAL",
	"busy_timeout = 5000",
	"foreign_keys = ON",
	"cache_size = -65536",
	"mmap_size = 268435456",
	"temp_store = MEMORY",
	"journal_size_limit = 67108864",
] as const;

export function createClient<TSchema extends Record<string, unknown>>(
	filePath: string,
	schema: TSchema,
): BetterSQLite3Database<TSchema> {
	if (cache.has(filePath))
		return cache.get(filePath) as BetterSQLite3Database<TSchema>;

	const sqlite = new Database(filePath);
	for (const pragma of PRAGMAS) sqlite.pragma(pragma);
	// SQLite's recommendation for a long-lived connection: on open, check every
	// table (0x10000), not just those this connection will touch, and analyze the
	// stale ones (0x02) from a bounded sample (analysis_limit) so it stays fast.
	sqlite.pragma("analysis_limit = 400");
	sqlite.pragma("optimize = 0x10002");
	keepOptimized(sqlite);

	const db = drizzle(sqlite, { schema });
	cache.set(filePath, db);
	return db;
}

// Query-planner statistics drift as the data does: `PRAGMA optimize` refreshes
// the ones that did, periodically while the process runs and once more when
// it ends. The timer never keeps the process alive.
function keepOptimized(sqlite: Database.Database): void {
	const optimize = () => {
		try {
			if (sqlite.open) sqlite.pragma("optimize");
		} catch {
			// a busy or closing database skips this round
		}
	};
	setInterval(optimize, OPTIMIZE_EVERY_MS).unref();
	process.once("exit", optimize);
}
