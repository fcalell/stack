import assert from "node:assert/strict";
import { test } from "node:test";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import {
	registeredScope,
	registerScope,
	releaseScope,
	type ScopeSchema,
	scoped,
	withScope,
} from "./scope.ts";
import type { Procedure, ScopedRouterClient } from "./types.ts";

// A client that answers with the input it was called with.
function fakeClient(): unknown {
	const node = (path: string[]): unknown =>
		new Proxy(async (input: unknown) => ({ path, input }), {
			get: (_, key) => (typeof key === "string" ? node([...path, key]) : null),
		});
	return node([]);
}

// What `.stack/schema.ts` says of each procedure: its scope key, or none.
const schema: ScopeSchema = {
	"projects.list": { scope: "organizationId" },
	"projects.create": { scope: "organizationId" },
	"pages.list": { scope: "projectId" },
	"search.run": { scope: null },
};

// biome-ignore lint/suspicious/noExplicitAny: the fake client is untyped
const utils: any = withScope(
	// biome-ignore lint/suspicious/noExplicitAny: the fake client is untyped
	createTanstackQueryUtils(fakeClient() as any),
	registeredScope,
	schema,
);

test("two registered scopes build two query keys for the same call", () => {
	registerScope({ organizationId: "org-a" });
	const a = utils.projects.list.queryOptions({ input: {} }).queryKey;
	registerScope({ organizationId: "org-b" });
	const b = utils.projects.list.queryOptions({ input: {} }).queryKey;
	assert.notDeepEqual(a, b);
	assert.deepEqual(a[1].input, { organizationId: "org-a" });
	assert.deepEqual(b[1].input, { organizationId: "org-b" });
});

test("a call with no input takes the scope, an explicit id wins", () => {
	registerScope({ organizationId: "org-a", projectId: "p-1" });
	// Only the procedure's own key is merged, never the rest of the scope.
	assert.deepEqual(utils.pages.list.queryOptions().queryKey[1].input, {
		projectId: "p-1",
	});
	const explicit = utils.pages.list.queryOptions({
		input: { projectId: "p-z", cursor: "c" },
	}).queryKey[1].input;
	assert.deepEqual(explicit, { projectId: "p-z", cursor: "c" });
});

test("an unscoped call under a boundary keeps its input and keys untouched", async () => {
	registerScope({ organizationId: "org-a", projectId: "p-1" });
	const input = { q: "x" };
	assert.deepEqual(
		utils.search.run.queryOptions({ input }).queryKey[1].input,
		input,
	);
	assert.deepEqual(
		utils.search.run.queryOptions().queryKey[1].input,
		undefined,
	);
	assert.deepEqual(await utils.search.run.call(input), {
		path: ["search", "run"],
		input,
	});
	// A procedure the schema does not name is left as it is too.
	assert.deepEqual(
		utils.other.run.queryOptions({ input }).queryKey[1].input,
		input,
	);
});

test("a scoped call with no scope and no id throws, naming the procedure and key", async () => {
	registerScope({});
	assert.throws(
		() => utils.projects.list.queryOptions({ input: {} }),
		/projects\.list is scoped to organizationId/,
	);
	await assert.rejects(
		async () => utils.projects.create.call({ name: "x" }),
		/projects\.create is scoped to organizationId/,
	);
	// An explicit id stands in for the boundary.
	assert.deepEqual(
		utils.projects.list.queryOptions({ input: { organizationId: "o" } })
			.queryKey[1].input,
		{ organizationId: "o" },
	);
});

test("a key built without an input stays a prefix", () => {
	registerScope({ organizationId: "org-a" });
	assert.deepEqual(utils.projects.list.queryKey(), [
		["projects", "list"],
		{ type: "query" },
	]);
});

test("the mutation and the call carry the scope", async () => {
	registerScope({ organizationId: "org-a" });
	const mutation = utils.projects.create.mutationOptions();
	assert.deepEqual(await mutation.mutationFn({ name: "x" }), {
		path: ["projects", "create"],
		input: { organizationId: "org-a", name: "x" },
	});
});

test("scoped() fixes the scope for a loader, outside any boundary", () => {
	registerScope({});
	const loader = scoped(utils, { organizationId: "org-l" }, schema);
	assert.deepEqual(
		loader.projects.list.queryOptions({ input: {} }).queryKey[1].input,
		{ organizationId: "org-l" },
	);
	// Nested layers extend: each sets the key it holds.
	const nested = scoped(loader, { projectId: "p-l" }, schema);
	assert.deepEqual(nested.projects.list.queryOptions().queryKey[1].input, {
		organizationId: "org-l",
	});
	assert.deepEqual(nested.pages.list.queryOptions().queryKey[1].input, {
		projectId: "p-l",
	});
});

// The type: a scoped procedure's scope key is optional, the rest required.
type Scoped = Procedure<
	{ organizationId: string; name: string },
	null,
	"organizationId"
>;
type Client = ScopedRouterClient<{ create: Scoped }>;
const _optional: Parameters<Client["create"]>[0] = { name: "x" };
// @ts-expect-error `name` stays required
const _required: Parameters<Client["create"]>[0] = { organizationId: "o" };
void _optional;
void _required;

test("an outer boundary registering after the inner never replaces it; releasing the inner restores the outer", () => {
	const org = { organizationId: "org-a" };
	const project = { organizationId: "org-a", projectId: "p-1" };
	registerScope(org, 1);
	registerScope(project, 2);
	registerScope(org, 1); // the outer boundary's mount effect, which React runs after the inner's
	assert.deepEqual(registeredScope(), project);
	const next = { organizationId: "org-a", projectId: "p-2" };
	registerScope(next, 2); // the next route's boundary renders before the old one's cleanup
	releaseScope(project, org, 1);
	assert.deepEqual(registeredScope(), next);
	releaseScope(next, org, 1);
	assert.deepEqual(registeredScope(), org);
	registerScope({});
});
