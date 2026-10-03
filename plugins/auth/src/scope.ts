import type {
	InferSelectModel,
	SQL,
	SQLiteColumn,
	SQLiteTable,
} from "@fcalell/plugin-db/orm";
import {
	type member,
	organization as organizationTable,
} from "./schema/organization.ts";

// A tenancy level: a row found by its `id`, whose parent is found by a
// column on that row, the chain ending at the organization, where the
// caller's membership decides access. A descriptor and nothing else, so the
// scopes module is isomorphic: the worker resolves it, the web names a
// boundary with the same object. The consumer's predicates are drizzle `SQL`
// fragments for the same reason.
//
// The procedure factory in plugin-api reads only `name` (the input key is
// `${name}Id`, the context gains the chain's rows) and hands the descriptor
// to the resolver the auth runtime puts on the request context.

type ScopeTable = SQLiteTable & { id: SQLiteColumn };

export interface Scope<TName extends string = string, TContext = unknown> {
	readonly name: TName;
	readonly table: ScopeTable;
	// The scope above and the column on this table holding its id; null at
	// the organization, the root.
	readonly parent: readonly [Scope, SQLiteColumn] | null;
	// The column a URL names the row by, unique within its parent. A scope
	// without one is addressed by id.
	readonly slug: SQLiteColumn | null;
	// Whether the row is visible to the member the root resolved: a fragment
	// over this scope's table, correlated to whatever it needs. Null when
	// every row of the member's organization is visible, as at the root.
	readonly where: ((member: MemberRow) => SQL) | null;
	// Phantom: what resolving the chain adds to a procedure's context.
	readonly __context?: TContext;
}

export type ScopeContext<S> = S extends Scope<string, infer C> ? C : never;

export type OrganizationRow = InferSelectModel<typeof organizationTable>;
export type MemberRow = InferSelectModel<typeof member>;

export const organization: Scope<
	"organization",
	{ organization: OrganizationRow; member: MemberRow }
> = {
	name: "organization",
	table: organizationTable,
	parent: null,
	slug: organizationTable.slug,
	where: null,
};

// Which `member` rows count as a membership at all: a fragment over the
// `member` table, which the root lookup already has in its `FROM`, correlated
// to any consumer table it needs. The scopes module exports at most one.
export interface Membership {
	readonly kind: "membership";
	readonly where: SQL;
}

export function defineMembership(where: SQL): Membership {
	return { kind: "membership", where };
}

// The context keys the organization level already holds.
const RESERVED = new Set(["organization", "member"]);

export function defineScope<
	const TName extends string,
	TTable extends ScopeTable,
	TParent extends Scope,
>(def: {
	name: TName;
	table: TTable;
	parent: readonly [TParent, SQLiteColumn];
	slug?: SQLiteColumn;
	where?: (member: MemberRow) => SQL;
}): Scope<
	TName,
	ScopeContext<TParent> & { [K in TName]: InferSelectModel<TTable> }
> {
	if (RESERVED.has(def.name)) {
		throw new Error(
			`defineScope: "${def.name}" names the organization level; pick another scope name.`,
		);
	}
	for (const [role, column] of [
		["parent", def.parent[1]],
		["slug", def.slug],
	] as const) {
		if (column && column.table !== def.table) {
			throw new Error(
				`defineScope("${def.name}"): the ${role} column belongs to another table.`,
			);
		}
	}
	return {
		name: def.name,
		table: def.table,
		parent: def.parent,
		slug: def.slug ?? null,
		where: def.where ?? null,
	};
}
