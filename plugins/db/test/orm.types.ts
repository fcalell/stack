// Type-only checks on plugin-db's `orm` re-exports, enforced by `check-types`.
import {
	alias,
	integer,
	type SQL,
	type sql,
	sqliteTable,
	text,
} from "../src/orm.ts";

type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;
function assertType<T extends true>(_: T): void {}

const notes = sqliteTable("notes", {
	id: integer("id").primaryKey(),
	body: text("body").notNull(),
	authorId: text("author_id"),
});

export function _checkAlias(): void {
	const later = alias(notes, "later");
	// @ts-expect-error the alias carries only the table's own columns
	later.title;
}

// A fragment built with sql is the re-exported SQL type.
assertType<Equal<SQL, ReturnType<typeof sql>>>(true);
