import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/solid-query";
import { boundaryView, scopeQueryOptions } from "../src/ui/lib/scope-lookup.ts";

const notFound = Object.assign(new Error("No such organization"), {
	code: "NOT_FOUND",
});

// The organization boundary's lookup as the switcher drives it: `acme`
// resolves, the address moves to `beta`, and `beta` answers later.
function lookups() {
	const answers = new Map<string, (value: unknown) => void>();
	const failures = new Map<string, (error: unknown) => void>();
	const fetch = (_scope: string, input: { slug: string }) =>
		new Promise<unknown>((resolve, reject) => {
			answers.set(input.slug, resolve);
			failures.set(input.slug, reject);
		});
	return { fetch, answers, failures };
}

async function settle() {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

test("a slug change keeps the previous chain until the next answers", async () => {
	const { fetch, answers } = lookups();
	const client = new QueryClient();
	const observer = new QueryObserver(
		client,
		scopeQueryOptions("organization", { slug: "acme" }, fetch),
	);
	const unsubscribe = observer.subscribe(() => {});
	assert.equal(boundaryView(observer.getCurrentResult()), "nothing");
	answers.get("acme")?.({ organization: { id: "acme" } });
	await settle();
	assert.equal(boundaryView(observer.getCurrentResult()), "children");

	observer.setOptions(
		scopeQueryOptions("organization", { slug: "beta" }, fetch),
	);
	const pending = observer.getCurrentResult();
	assert.equal(boundaryView(pending), "children");
	assert.equal(pending.isPlaceholderData, true);
	assert.deepEqual(pending.data, { organization: { id: "acme" } });

	answers.get("beta")?.({ organization: { id: "beta" } });
	await settle();
	const answered = observer.getCurrentResult();
	assert.equal(answered.isPlaceholderData, false);
	assert.deepEqual(answered.data, { organization: { id: "beta" } });
	unsubscribe();
});

test("a slug that resolves nothing draws the not-found screen", async () => {
	const { fetch, answers, failures } = lookups();
	const client = new QueryClient();
	const observer = new QueryObserver(
		client,
		scopeQueryOptions("organization", { slug: "acme" }, fetch),
	);
	const unsubscribe = observer.subscribe(() => {});
	answers.get("acme")?.({ organization: { id: "acme" } });
	await settle();
	observer.setOptions(
		scopeQueryOptions("organization", { slug: "gone" }, fetch),
	);
	failures.get("gone")?.(notFound);
	await settle();
	assert.equal(boundaryView(observer.getCurrentResult()), "notFound");
	unsubscribe();
});

// Every result the boundary sees while its resolved lookup refetches, with
// the same answer and with a new one: the children stay drawn throughout, so
// nothing under the boundary is torn down by a refetch.
test("a refetch never leaves the children", async () => {
	const { fetch, answers } = lookups();
	const client = new QueryClient();
	const observer = new QueryObserver(
		client,
		scopeQueryOptions("organization", { slug: "acme" }, fetch),
	);
	const seen: string[] = [];
	const unsubscribe = observer.subscribe((result) => {
		seen.push(boundaryView(result));
	});
	answers.get("acme")?.({ organization: { id: "acme", name: "Acme" } });
	await settle();
	seen.length = 0;

	const same = observer.refetch();
	answers.get("acme")?.({ organization: { id: "acme", name: "Acme" } });
	await same;
	const renamed = observer.refetch();
	answers.get("acme")?.({ organization: { id: "acme", name: "Acme Inc" } });
	await renamed;
	await settle();

	assert.ok(seen.length > 0);
	assert.deepEqual(new Set(seen), new Set(["children"]));
	assert.deepEqual(observer.getCurrentResult().data, {
		organization: { id: "acme", name: "Acme Inc" },
	});
	unsubscribe();
});
