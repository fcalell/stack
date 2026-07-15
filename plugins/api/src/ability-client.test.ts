import { subject } from "@casl/ability";
import { packRules } from "@casl/ability/extra";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	composeAbility,
	fetchOrgRules,
	getRegisteredApiClient,
	ORG_RULES_QUERY_KEY,
	registerApiClient,
} from "./ability-client";
import { createClient } from "./client";
import { STACK_READS_HEADER, STACK_WRITES_HEADER } from "./procedure";
import { handleMutationSuccess } from "./query-invalidation";
import type { Procedure } from "./types";

// `RouterClient` only maps branded `Procedure<TIn, TOut>` members, so the
// fake router shape carries the same brand real generated routers do (see
// `./client.test.ts`).
type FakeRouter = {
	auth: {
		orgRules: Procedure<Record<string, unknown>, { rules: unknown[] }>;
	};
};

function jsonResponse(body: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify({ json: body }), {
		...init,
		headers: { "content-type": "application/json", ...init?.headers },
	});
}

// Isolate the module-level default-client singleton between tests -- the
// same pattern `registerApiClient` documents: registering `undefined` clears
// it back to "no client registered".
beforeEach(() => {
	registerApiClient(undefined);
});

afterEach(() => {
	registerApiClient(undefined);
});

describe("composeAbility (WS6.3)", () => {
	it("denies everything when both layers are absent", () => {
		const ability = composeAbility(undefined, undefined);
		expect(ability.can("update", "organization")).toBe(false);
		expect(ability.can("read", "organization")).toBe(false);
	});

	it("answers org-level checks from org rules alone", () => {
		const orgRules = packRules([{ action: "update", subject: "organization" }]);
		const ability = composeAbility(orgRules, undefined);
		expect(ability.can("update", "organization")).toBe(true);
		expect(ability.can("delete", "organization")).toBe(false);
	});

	it("layers record rules onto org rules -- both answer their own checks", () => {
		const orgRules = packRules([{ action: "update", subject: "organization" }]);
		const recordRules = packRules([
			{ action: "update", subject: "Expense", conditions: { paidById: "u1" } },
		]);

		const ability = composeAbility(orgRules, recordRules);

		expect(ability.can("update", "organization")).toBe(true);
		expect(ability.can("update", subject("Expense", { paidById: "u1" }))).toBe(
			true,
		);
		expect(ability.can("update", subject("Expense", { paidById: "u2" }))).toBe(
			false,
		);
	});

	it("returns the same instance for unchanged rules-array identity", () => {
		const orgRules = packRules([{ action: "update", subject: "organization" }]);
		const recordRules = packRules([{ action: "read", subject: "Expense" }]);

		const first = composeAbility(orgRules, recordRules);
		const second = composeAbility(orgRules, recordRules);

		expect(second).toBe(first);
	});

	it("returns a new instance when the rules-array identity changes", () => {
		const orgRules = packRules([{ action: "update", subject: "organization" }]);
		const recordRulesA = packRules([{ action: "read", subject: "Expense" }]);
		const recordRulesB = packRules([{ action: "read", subject: "Expense" }]);

		const first = composeAbility(orgRules, recordRulesA);
		const second = composeAbility(orgRules, recordRulesB);

		expect(second).not.toBe(first);
	});
});

describe("registerApiClient / getRegisteredApiClient (WS6.3)", () => {
	it("has no client registered by default", () => {
		expect(getRegisteredApiClient()).toBeUndefined();
	});

	it("createClient auto-registers the first client it creates", () => {
		const client = createClient<FakeRouter>({
			url: "https://api.example.com/rpc",
			fetch: (async () =>
				jsonResponse({ rules: [] })) as unknown as typeof globalThis.fetch,
		});

		expect(getRegisteredApiClient()).toBe(client);
	});

	it("a second createClient call does not overwrite the registered default", () => {
		const first = createClient<FakeRouter>({
			url: "https://api.example.com/rpc",
			fetch: (async () =>
				jsonResponse({ rules: [] })) as unknown as typeof globalThis.fetch,
		});
		createClient<FakeRouter>({
			url: "https://other.example.com/rpc",
			fetch: (async () =>
				jsonResponse({ rules: [] })) as unknown as typeof globalThis.fetch,
		});

		expect(getRegisteredApiClient()).toBe(first);
	});

	it("an explicit registerApiClient always overrides, even after createClient ran", () => {
		createClient<FakeRouter>({
			url: "https://api.example.com/rpc",
			fetch: (async () =>
				jsonResponse({ rules: [] })) as unknown as typeof globalThis.fetch,
		});
		const explicit = { marker: "explicit" };

		registerApiClient(explicit);

		expect(getRegisteredApiClient()).toBe(explicit);
	});
});

describe("fetchOrgRules (WS6.3)", () => {
	it("throws when no client is registered (never caches a false deny-all under staleTime: Infinity)", async () => {
		await expect(fetchOrgRules()).rejects.toThrow(/no api client registered/);
	});

	it("walks ORG_RULES_PATH on a real client and returns the rules field", async () => {
		const packed = packRules([{ action: "update", subject: "organization" }]);
		createClient<FakeRouter>({
			url: "https://api.example.com/rpc",
			fetch: (async () =>
				jsonResponse({
					rules: packed,
				})) as unknown as typeof globalThis.fetch,
		});

		await expect(fetchOrgRules()).resolves.toEqual(packed);
	});

	it("returns [] when the org-rules route answers NOT_FOUND (no organization support)", async () => {
		createClient<FakeRouter>({
			url: "https://api.example.com/rpc",
			fetch: (async () =>
				jsonResponse(
					{
						defined: false,
						code: "NOT_FOUND",
						status: 404,
						message: "Not found",
					},
					{ status: 404 },
				)) as unknown as typeof globalThis.fetch,
		});

		await expect(fetchOrgRules()).resolves.toEqual([]);
	});

	it("propagates a real failure instead of silently denying", async () => {
		createClient<FakeRouter>({
			url: "https://api.example.com/rpc",
			fetch: (async () =>
				jsonResponse(
					{
						defined: false,
						code: "INTERNAL_SERVER_ERROR",
						status: 500,
						message: "boom",
					},
					{ status: 500 },
				)) as unknown as typeof globalThis.fetch,
		});

		await expect(fetchOrgRules()).rejects.toThrow();
	});
});

// WS1 fix: previously `api.slots.entities` was a single-owner value slot, so
// nothing ever declared "member" as a legal entity and `auth.orgRules` never
// stamped `reads`. A role-changing mutation's `writes: ["member"]` was
// therefore a dead letter -- the org-rules query never invalidated. Drives
// the real `createClient` + a real `QueryClient` end to end to prove the
// previously-broken promise now holds.
describe("auth/orgRules entity-based invalidation (WS1 regression)", () => {
	it("a mutation whose response carries x-stack-writes: member invalidates a cached auth/orgRules query", async () => {
		type FakeOrgWriteRouter = FakeRouter & {
			members: { promote: Procedure<Record<string, unknown>, { ok: boolean }> };
		};

		const client = createClient<FakeOrgWriteRouter>({
			url: "https://api.example.com/rpc",
			fetch: (async (request: Request) => {
				const pathname = new URL(request.url).pathname;
				if (pathname.endsWith("/auth/orgRules")) {
					return jsonResponse(
						{ rules: [] },
						{ headers: { [STACK_READS_HEADER]: "member" } },
					);
				}
				return jsonResponse(
					{ ok: true },
					{ headers: { [STACK_WRITES_HEADER]: "member" } },
				);
			}) as unknown as typeof globalThis.fetch,
		});

		// Real org-rules call through the real client -- captures reads=member
		// for pathKey "auth/orgRules", the same call `useAbility`'s `useQuery`
		// makes in a real app.
		await client.auth.orgRules({});

		const queryClient = new QueryClient();
		queryClient.setQueryData(ORG_RULES_QUERY_KEY, { rules: [] });

		// Real mutation call through the same client -- captures writes=member
		// for pathKey "members/promote".
		await client.members.promote({});

		// Mirrors what `createAutoInvalidationMutationCache`'s `onSuccess` hook
		// (./tanstack-query.tsx) passes as `mutation.options.mutationKey`.
		handleMutationSuccess(queryClient, [
			["members", "promote"],
			{ type: "mutation" },
		]);

		expect(queryClient.getQueryState(ORG_RULES_QUERY_KEY)?.isInvalidated).toBe(
			true,
		);
	});
});
