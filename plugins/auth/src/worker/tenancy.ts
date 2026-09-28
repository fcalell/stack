import { and, eq } from "@fcalell/plugin-db/orm";
import {
	member,
	organization as organizationTable,
} from "../schema/organization.ts";
import type { Scope } from "../scope.ts";

// The request context's tenancy capability, which plugin-api's `scope`,
// `can` and `rbac` procedure options call. Resolution is stateless: the
// chain comes from the rows, the access from the caller's membership of the
// organization at its root, never from the session.
export interface Tenancy {
	// The rows of `scope`'s chain for `id` as context entries, plus the
	// caller's `member` row; null when any level is absent or the caller is
	// no member, so a guessed id never confirms that a row exists.
	resolve(
		scope: Scope,
		id: string,
		userId: string,
	): Promise<Record<string, unknown> | null>;
	// The same chain for the row a URL names: its slug, unique within the
	// parent whose id comes along (none for the organization).
	bySlug(
		scope: Scope,
		slug: string,
		parentId: string | undefined,
		userId: string,
	): Promise<Record<string, unknown> | null>;
	// Whether `role` grants every action named in `permissions`.
	can(role: string, permissions: Record<string, readonly string[]>): boolean;
}

// The surface of the drizzle client this module reads: one-row selects. The
// sqlite and D1 clients both answer `get()`, one synchronously, one with a
// promise, and `await` reads both.
interface SelectClient {
	select(fields: Record<string, unknown>): {
		from(table: unknown): {
			innerJoin(
				table: unknown,
				on: unknown,
			): { where(condition: unknown): { get(): unknown } };
			where(condition: unknown): { get(): unknown };
		};
	};
}

export function createTenancy(
	db: unknown,
	roles: Record<string, unknown>,
): Tenancy {
	const client = db as SelectClient;

	// The organization matching `where` and the caller's membership of it, in
	// one join.
	async function resolveOrganization(
		where: ReturnType<typeof eq>,
		userId: string,
	): Promise<Record<string, unknown> | null> {
		const row = (await client
			.select({ organization: organizationTable, member })
			.from(member)
			.innerJoin(
				organizationTable,
				eq(member.organizationId, organizationTable.id),
			)
			.where(and(where, eq(member.userId, userId)))
			.get()) as { organization: unknown; member: unknown } | undefined;
		return row ? { organization: row.organization, member: row.member } : null;
	}

	async function resolve(
		scope: Scope,
		id: string,
		userId: string,
	): Promise<Record<string, unknown> | null> {
		if (scope.parent === null) {
			return resolveOrganization(eq(organizationTable.id, id), userId);
		}
		const [parent, parentColumn] = scope.parent;
		const found = (await client
			.select({ row: scope.table, parentId: parentColumn })
			.from(scope.table)
			.where(eq(scope.table.id, id))
			.get()) as { row: unknown; parentId: unknown } | undefined;
		if (!found || typeof found.parentId !== "string") return null;
		const above = await resolve(parent, found.parentId, userId);
		return above ? { ...above, [scope.name]: found.row } : null;
	}

	return {
		resolve,
		async bySlug(scope, slug, parentId, userId) {
			if (scope.slug === null) return null;
			if (scope.parent === null) {
				return resolveOrganization(eq(scope.slug, slug), userId);
			}
			if (parentId === undefined) return null;
			const found = (await client
				.select({ id: scope.table.id })
				.from(scope.table)
				.where(and(eq(scope.slug, slug), eq(scope.parent[1], parentId)))
				.get()) as { id: string } | undefined;
			return found ? resolve(scope, found.id, userId) : null;
		},
		can(role, permissions) {
			const grants = resolveGrants(role, roles);
			return Object.entries(permissions).every(([resource, actions]) =>
				actions.every((action) => grants[resource]?.includes(action)),
			);
		},
	};
}

// A role's grants, either the bare `{resource: actions[]}` record
// `createAccessControl().newRole()` (`../access.ts`) and `defaultOrgRoles`
// return, or `.statements` on a real better-auth `Role` (a consumer who
// imported `better-auth/plugins/access` directly).
function grantsOf(role: unknown): Record<string, readonly string[]> | null {
	if (!role || typeof role !== "object") return null;
	if ("statements" in role) {
		const statements = (role as { statements: unknown }).statements;
		if (statements && typeof statements === "object") {
			return statements as Record<string, readonly string[]>;
		}
	}
	return role as Record<string, readonly string[]>;
}

// better-auth's member role is a comma-separated multi-role string: the
// grants are the union of every named role's. An unknown name adds nothing.
export function resolveGrants(
	roleField: string,
	roles: Record<string, unknown>,
): Record<string, readonly string[]> {
	const merged = new Map<string, Set<string>>();
	for (const name of roleField.split(",")) {
		const grants = grantsOf(roles[name]);
		if (!grants) continue;
		for (const [resource, actions] of Object.entries(grants)) {
			const set = merged.get(resource) ?? new Set<string>();
			for (const action of actions) set.add(action);
			merged.set(resource, set);
		}
	}
	return Object.fromEntries(
		[...merged].map(([resource, actions]) => [resource, [...actions]]),
	);
}
