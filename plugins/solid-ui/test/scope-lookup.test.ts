import assert from "node:assert/strict";
import { test } from "node:test";
import {
	addressToRemember,
	forgetScope,
	forgetScopeAt,
	isNotFound,
	lastScope,
	rememberScope,
	scopeLookup,
	scopePath,
} from "../src/ui/lib/scope-lookup.ts";

const organization = { name: "organization", parent: null };
const project = { name: "project", parent: [organization, null] as const };

test("the organization is looked up by its slug alone", () => {
	assert.deepEqual(scopeLookup(organization, "acme", undefined), {
		slug: "acme",
	});
});

test("a nested scope sends its parent's id from the boundary above", () => {
	assert.deepEqual(
		scopeLookup(project, "site", { organization: { id: "org-1" } }),
		{ slug: "site", parentId: "org-1" },
	);
});

test("a nested scope with no boundary above for its parent has no lookup", () => {
	assert.equal(scopeLookup(project, "site", undefined), null);
});

test("only a NOT_FOUND error is the boundary's to draw", () => {
	assert.equal(isNotFound({ code: "NOT_FOUND" }), true);
	assert.equal(isNotFound({ code: "INTERNAL_SERVER_ERROR" }), false);
	assert.equal(isNotFound(new Error("offline")), false);
});

test("a scope's address ends at the segment naming its slug", () => {
	assert.equal(scopePath("/acme/settings", undefined, "acme"), "/acme");
	assert.equal(
		scopePath("/acme/projects/shop/schema", "/acme", "shop"),
		"/acme/projects/shop",
	);
});

test("a deeper address that resolves nothing is never a scope's address", () => {
	assert.equal(
		scopePath("/acme/projects/nope/deeper", undefined, "acme"),
		"/acme",
	);
});

test("a project named like its organization is found after the organization", () => {
	assert.equal(
		scopePath("/shop/projects/shop/tags", "/shop", "shop"),
		"/shop/projects/shop",
	);
});

test("a slug is compared decoded, and an address without it has no scope", () => {
	assert.equal(scopePath("/caf%C3%A9", undefined, "café"), "/caf%C3%A9");
	assert.equal(scopePath("/other", undefined, "acme"), null);
});

// The browser's storage, one key to a string, as the boundary reads it.
function withStorage(): void {
	const store = new Map<string, string>();
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => store.set(key, value),
			removeItem: (key: string) => store.delete(key),
		},
	});
}

test("a scope that resolves to nothing forgets the address that led there", () => {
	withStorage();
	rememberScope("u1", "/acme");
	forgetScopeAt("u1", "/acme");
	assert.equal(lastScope("u1"), null);
	rememberScope("u1", "/acme/projects/shop");
	forgetScopeAt("u1", "/acme");
	assert.equal(lastScope("u1"), null);
});

test("a scope that resolves to nothing keeps a last address elsewhere", () => {
	withStorage();
	rememberScope("u1", "/acme-labs");
	forgetScopeAt("u1", "/acme");
	assert.equal(lastScope("u1"), "/acme-labs");
	forgetScopeAt("u1", null);
	assert.equal(lastScope("u1"), "/acme-labs");
});

test("two viewers on one browser each read only their own last address", () => {
	withStorage();
	rememberScope("u1", "/acme");
	rememberScope("u2", "/globex/projects/shop");
	assert.equal(lastScope("u1"), "/acme");
	assert.equal(lastScope("u2"), "/globex/projects/shop");
	assert.equal(lastScope("u3"), null);
	forgetScope("u1");
	assert.equal(lastScope("u1"), null);
	assert.equal(lastScope("u2"), "/globex/projects/shop");
	forgetScopeAt("u2", "/acme");
	assert.equal(lastScope("u2"), "/globex/projects/shop");
});

test("forgetScope forgets the last address, with or without storage", () => {
	withStorage();
	rememberScope("u1", "/acme");
	forgetScope("u1");
	assert.equal(lastScope("u1"), null);
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		get: () => {
			throw new Error("no storage");
		},
	});
	forgetScope("u1");
	assert.equal(lastScope("u1"), null);
});

test("a boundary records its address only as a resolved place for a signed-in viewer", () => {
	const resolved = {
		remember: undefined,
		answered: true,
		deeper: 0,
		path: "/acme",
		viewer: "u1",
	};
	assert.deepEqual(addressToRemember(resolved), {
		viewer: "u1",
		path: "/acme",
	});
	assert.deepEqual(addressToRemember({ ...resolved, remember: true }), {
		viewer: "u1",
		path: "/acme",
	});
	for (const state of [
		// An onboarding step: resolved, never where `/` returns to.
		{ ...resolved, remember: false },
		{ ...resolved, answered: false },
		// A resolved boundary under it records the deeper address instead.
		{ ...resolved, deeper: 1 },
		{ ...resolved, path: null },
		{ ...resolved, viewer: null },
		{ ...resolved, viewer: undefined },
	]) {
		assert.equal(addressToRemember(state), null, JSON.stringify(state));
	}
});
