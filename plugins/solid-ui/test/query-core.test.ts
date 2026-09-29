import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { findPackageJSON } from "node:module";
import { test } from "node:test";

// The package a specifier resolves to from `base`, by its real path.
function packageAt(specifier: string, base: string | URL): string {
	const found = findPackageJSON(specifier, base);
	assert.ok(found, `${specifier} resolves from nowhere`);
	return realpathSync(found);
}

// A consumer hands `createApiQueryUtils(client).x.queryOptions(...)`, typed by
// oRPC's query-core, to solid-query's `useQuery`, typed by its own; two
// copies make the options unassignable on `QueryClient`'s private field.
test("solid-query and oRPC's query utils share one query-core", () => {
	const solidQuery = packageAt("@tanstack/solid-query", import.meta.url);
	const orpc = packageAt("@orpc/tanstack-query", import.meta.url);
	assert.equal(
		packageAt("@tanstack/query-core", orpc),
		packageAt("@tanstack/query-core", solidQuery),
	);
});
