import {
	type AbilityTuple,
	createMongoAbility,
	type MongoAbility,
	type MongoQuery,
	type RawRuleOf,
} from "@casl/ability";
import { type PackRule, unpackRules } from "@casl/ability/extra";
import { ORPCError } from "@orpc/client";
import { ORG_RULES_PATH, SCOPE_ROUTES_PATH } from "./wire.ts";

// WS6.3: framework-agnostic core behind
// `useAbility()` for both react (expo, ./tanstack-query.tsx) and solid (web,
// plugin-solid-ui's ui/lib/ability.ts). No react/solid imports here.

// The wire shape is CASL's `packRules` array. It's opaque JSON at this
// layer -- plugin-api depends on the dependency direction (auth -> api), so
// it can't import plugin-auth's `PackedRules<A>` type, only unpack the data
// generically.
export type PackedRulesLike = readonly unknown[];

function unpack(rules: PackedRulesLike): RawRuleOf<MongoAbility>[] {
	return unpackRules(rules as unknown as PackRule<RawRuleOf<MongoAbility>>[]);
}

// ---------- Default-client registration ----------
// Mirrors `defaultEntityRegistry` (./query-invalidation.ts): a module-level
// singleton so `useAbility()` needs zero wiring in the common case (one
// client per app). `./client.ts`'s `createClient` calls `registerApiClient`
// internally only when nothing is registered yet, so the first client
// created wins as the default; an explicit call always overwrites,
// regardless of call order.
//
// Per-JS-isolate, single-user assumption: this module-level singleton
// assumes one client for the lifetime of the isolate (CSR in a browser tab,
// or a native app's single JS runtime) -- it is NOT per-request. An SSR
// target that reuses the same isolate across requests/users (Node, most
// non-Workers SSR runtimes) must never rely on it: a request from user A
// could read user B's registered client. SSR consumers should call
// `registerApiClient` (or otherwise thread the client explicitly) within
// each request's own scope instead of depending on this default.
let registeredApiClient: unknown;

export function registerApiClient(client: unknown): void {
	registeredApiClient = client;
}

// Internal: read by `fetchOrgRules` and by `./client.ts`'s auto-registration
// guard. Not a consumer-facing surface -- there's nothing to inspect on the
// value beyond "is a client registered".
export function getRegisteredApiClient(): unknown {
	return registeredApiClient;
}

// A framework-owned route (one a runtime plugin registers, outside the
// consumer's typed router) on the registered client. An `@orpc/client`
// client is a `Proxy` whose `get` builds a callable child per path segment,
// so walking the path yields the callable route.
function registeredRoute(
	path: readonly string[],
	caller: string,
): (input: unknown) => Promise<unknown> {
	const client = getRegisteredApiClient();
	if (client === undefined) {
		throw new Error(
			`${caller}: no api client registered -- call \`createClient(...)\` ` +
				`(@fcalell/plugin-api/client) before ${caller} runs.`,
		);
	}
	return path.reduce<unknown>(
		(node, segment) => (node as Record<string, unknown>)[segment],
		client,
	) as (input: unknown) => Promise<unknown>;
}

// ---------- Org rules fetch ----------

// The caller's rules in one organization: their role there, never the
// session's active organization. `useAbility`'s query runs with
// `staleTime: Infinity`, so a missing client throws rather than caching a
// false deny-all forever; the query's error state (retries, deny-all
// meanwhile) surfaces it.
export async function fetchOrgRules(
	organizationId: string,
): Promise<PackedRulesLike> {
	const route = registeredRoute(ORG_RULES_PATH, "useAbility()");
	try {
		const response = (await route({ organizationId })) as {
			rules: PackedRulesLike;
		};
		return response.rules;
	} catch (error) {
		// NOT_FOUND means no org layer (the route exists only with organizations
		// on) or no membership of this organization: both deny everything, and
		// neither is a real failure. Every other error propagates: a real outage must
		// surface through the query's error state, never a silent deny-all.
		if (error instanceof ORPCError && error.code === "NOT_FOUND") return [];
		throw error;
	}
}

// ---------- Scope lookup ----------

export interface ScopeLookupInput {
	slug: string;
	parentId?: string;
}

function scopeLookupPath(scope: string) {
	return [...SCOPE_ROUTES_PATH, scope, "bySlug"] as const;
}

// Shaped like the org rules key, so entity invalidation and prefix
// invalidation treat a lookup as any other oRPC-backed query.
export function scopeQueryKey(scope: string, input: ScopeLookupInput) {
	return [scopeLookupPath(scope), { input }] as const;
}

// Resolves a URL slug to its scope's chain: the rows from the organization
// down, and the caller's `member` row. Slugs are unique within their parent,
// so every scope below the organization names its parent's id. NOT_FOUND
// (no such row, or the caller is no member) propagates for the boundary to
// draw.
export async function fetchScope(
	scope: string,
	input: ScopeLookupInput,
): Promise<Record<string, unknown>> {
	const route = registeredRoute(scopeLookupPath(scope), "ScopeBoundary");
	return (await route(input)) as Record<string, unknown>;
}

// ---------- Ability composition ----------

// WS6.3: deny-all default, memoized per (orgRules, recordRules) array
// identity. `useAbility` composes on every call; recreating a `MongoAbility`
// each time would defeat structural sharing -- a fresh class instance never
// `===` the last one -- so callers must never select the ability itself out
// of a query cache. Compose it here instead, where identical array
// references always produce the identical ability instance.
const DENY_ALL: MongoAbility = createMongoAbility([]);
const EMPTY_RULES: PackedRulesLike = [];
const compositionCache = new WeakMap<
	PackedRulesLike,
	WeakMap<PackedRulesLike, MongoAbility>
>();

// Deny-all when both layers are absent/undefined (rules not loaded yet, no
// record layer supplied). Otherwise concatenates org ∪ record rules into one
// ability: CASL rule concatenation is safe across the two because subject
// namespaces can't collide (org subjects are framework-owned lowercase
// resource names like "organization"/"member"/"invitation"; record subjects
// are consumer domain types).
export function composeAbility(
	orgRules: PackedRulesLike | undefined,
	recordRules?: PackedRulesLike | undefined,
): MongoAbility {
	if (!orgRules && !recordRules) return DENY_ALL;

	const org = orgRules ?? EMPTY_RULES;
	const record = recordRules ?? EMPTY_RULES;

	let byRecord = compositionCache.get(org);
	if (!byRecord) {
		byRecord = new WeakMap();
		compositionCache.set(org, byRecord);
	}

	let ability = byRecord.get(record);
	if (!ability) {
		// Explicit type args: `createMongoAbility`'s generic overload otherwise
		// infers the weaker `AnyMongoAbility` from a plain `RawRuleOf<MongoAbility>`
		// array, which doesn't structurally satisfy `MongoAbility` itself.
		ability = createMongoAbility<AbilityTuple, MongoQuery>([
			...unpack(org),
			...unpack(record),
		]);
		byRecord.set(record, ability);
	}
	return ability;
}

// ---------- Query key ----------

// Shaped like `@orpc/tanstack-query`'s operation keys (`[path, { input }]`)
// so the entity-based invalidation registry (./query-invalidation.ts), which
// matches on the path, recognizes it for free: a mutation that declares
// `writes` on an org subject (e.g. "member") invalidates every
// organization's rules, as any other oRPC-backed query. The bare path is the
// prefix for explicit invalidation of all of them:
// `queryClient.invalidateQueries({ queryKey: ORG_RULES_QUERY_KEY })`.
export const ORG_RULES_QUERY_KEY = [ORG_RULES_PATH] as const;

export function orgRulesQueryKey(organizationId: string) {
	return [ORG_RULES_PATH, { input: { organizationId } }] as const;
}
