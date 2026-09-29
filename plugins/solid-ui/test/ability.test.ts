import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/solid-query";
import { orgRulesQueryOptions } from "../src/ui/lib/ability.ts";

// `useAbility`'s `pending()` is its rules query's `isLoading`: these pin
// what that reads for the hook's own options.

function rules() {
	const answers: Array<(rules: readonly unknown[]) => void> = [];
	const failures: Array<(error: unknown) => void> = [];
	const fetch = () =>
		new Promise<readonly unknown[]>((resolve, reject) => {
			answers.push(resolve);
			failures.push(reject);
		});
	return { fetch, answers, failures };
}

async function settle() {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

test("pending while the first fetch runs, not once answered or on a refetch", async () => {
	const { fetch, answers } = rules();
	const client = new QueryClient();
	const observer = new QueryObserver(
		client,
		orgRulesQueryOptions("acme", fetch),
	);
	const unsubscribe = observer.subscribe(() => {});
	assert.equal(observer.getCurrentResult().isLoading, true);
	answers[0]?.([]);
	await settle();
	assert.equal(observer.getCurrentResult().isLoading, false);

	void client.invalidateQueries();
	await settle();
	assert.equal(observer.getCurrentResult().isFetching, true);
	assert.equal(observer.getCurrentResult().isLoading, false);
	unsubscribe();
});

test("not pending once the first fetch failed", async () => {
	const { fetch, failures } = rules();
	const client = new QueryClient();
	const observer = new QueryObserver(client, {
		...orgRulesQueryOptions("acme", fetch),
		retry: false,
	});
	const unsubscribe = observer.subscribe(() => {});
	assert.equal(observer.getCurrentResult().isLoading, true);
	failures[0]?.(new Error("outage"));
	await settle();
	assert.equal(observer.getCurrentResult().isError, true);
	assert.equal(observer.getCurrentResult().isLoading, false);
	unsubscribe();
});

test("not pending with no organization", () => {
	const { fetch } = rules();
	const client = new QueryClient();
	const observer = new QueryObserver(
		client,
		orgRulesQueryOptions(undefined, fetch),
	);
	const unsubscribe = observer.subscribe(() => {});
	assert.equal(observer.getCurrentResult().isLoading, false);
	unsubscribe();
});
