# Full-text search

`ftsTable` declares an FTS5 index over a table's text columns, in `src/schema/index.ts` beside
the table. The index is external-content: it holds tokens only, the text stays in the table, and
three triggers keep the two in step on every insert, delete and update. It works on both
dialects.

```ts
// src/schema/index.ts
import { ftsTable, integer, sqliteTable, text } from "@fcalell/plugin-db/orm";

export const tracks = sqliteTable("tracks", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album"),
  plays: integer("plays").notNull().default(0),
});

export const trackSearch = ftsTable("track_search", {
  content: tracks,
  columns: ["title", "artist", "album"],
  prefix: [2, 3],
});
```

| Option | Default | Effect |
| --- | --- | --- |
| `content` | required | The table to index. It needs an integer primary key |
| `columns` | required | Its columns to index, by property name |
| `prefix` | none | Prefix lengths indexed for `term*` queries; each costs index size and write time |
| `tokenize` | `unicode61 remove_diacritics 2` | Case and accent folding ("Beyonce" finds "Beyoncé"); `porter unicode61 remove_diacritics 2` adds stemming, `trigram` matches any substring |
| `rowid` | the integer primary key | The integer column that addresses a row in the index |

## Querying

`match` selects the rows a query finds, `bm25` ranks them (lower is better), `highlight` wraps
the hits, and the index joins to its table on `rowid`. Pass what a person typed through
`ftsQuery`: it returns a query that cannot be a syntax error, with the last word a prefix, or
`null` when nothing searchable was typed, which FTS5 would refuse.

```ts
import { bm25, eq, ftsQuery, getTableColumns, match } from "@fcalell/plugin-db/orm";
import { trackSearch, tracks } from "../../schema/index.ts";

const query = ftsQuery(input.text);
if (!query) return [];

return context.db
  .select({ ...getTableColumns(tracks), score: bm25(trackSearch, { title: 10, artist: 5 }) })
  .from(trackSearch)
  .innerJoin(tracks, eq(tracks.id, trackSearch.rowid))
  .where(match(trackSearch, query))
  .orderBy(bm25(trackSearch, { title: 10, artist: 5 }))
  .limit(50);
```

A search a `Table` scrolls is a window: `paginateWindow` takes the join and `bm25` as the order
(`plugins/api/guide/utilities.md`, "Window pagination").

Name the table, not the index, in `reads` (`reads: ["tracks"]`): a write to the table is what
changes a search result.

## How it migrates

Drizzle does not model virtual tables, and `ftsTable` is invisible to it, so the index has its
own path:

- `stack db generate` writes the index as a custom migration of its own (`fts_track_search`),
  after the migration that makes the table. A changed declaration writes a migration that
  replaces the index; a removed one writes a migration that drops it. A migration that rebuilds
  the table (SQLite copies it: dropping a column default, changing a constraint) gets the
  triggers and a rebuild of the index appended, since the copy takes the old table's triggers with
  it. The copy itself reads only the columns the table had before the migration, so a column
  added in the same change takes its default instead of failing the migration.
- `stack dev` and `stack db push` create or converge the index after the tables are pushed.
- `stack db check` reports a declared, changed or removed index with no migration as drift.
- `stack db check` (and a d1 `stack deploy`) refuses a committed migration that rebuilds an
  indexed table and creates the index's triggers nowhere after the rebuild: a hand-written copy,
  or one generated before the resync existed. Append the resync to it, or add a new custom
  migration (`stack db generate --custom`) holding the `DROP TRIGGER IF EXISTS` and
  `CREATE TRIGGER` statements of the index's `fts_<name>` migration and
  `INSERT INTO <name>(<name>) VALUES ('rebuild');`.

Each index migration starts with a `-- stack:fts <name> <hash>` line: it is how the next
`generate` knows the index is current. Never edit or delete it. The seed needs nothing: its
inserts fire the triggers.

## Rules

- Write rows with `insert`, `update` and `onConflictDoUpdate`. Never `INSERT OR REPLACE` or
  `onConflictDoReplace`: SQLite fires no delete trigger for the row it replaces, and the index
  keeps the old text.
- Never create or alter the index by hand in a migration; change the declaration.
- Keep `columns` to the text a person searches. An update of any other column does not touch the
  index.

**Check:** `stack db generate` writes `fts_<name>`, then `stack db check` passes.
