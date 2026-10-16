import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { createMongoAbility } from "@casl/ability";
import { packRules } from "@casl/ability/extra";
import { QueriesObserver, QueryClient } from "@tanstack/react-query";
import {
	ability,
	orgRules,
	orgRulesQueryKey,
	registerApiClient,
} from "../src/ability-client.ts";
import {
	placeholderData,
	planSelections,
	read,
	watchUnheld,
} from "../src/read.ts";
import { ORG_RULES_PATH } from "../src/wire.ts";

const tick = () => new Promise<void>((r) => setTimeout(r, 5));

// An api client whose org-rules route is `route`, walked the way an oRPC
// client's proxy is: one callable child per path segment.
function register(route: (input: unknown) => Promise<unknown>) {
	const client = ORG_RULES_PATH.reduceRight<unknown>(
		(child, key) => ({ [key]: child }),
		route,
	);
	registerApiClient(client);
}

const pack = (rules: Parameters<typeof createMongoAbility>[0]) =>
	packRules(rules as never);
const packed = pack([{ action: "read", subject: "deploy" }]);

// Runs the selection's plan through a real QueriesObserver, as a leaf does.
function observe(client: QueryClient, value: unknown) {
	const plan = planSelections([value]);
	const observer = new QueriesObserver(
		client,
		plan.reads.map((r) => ({ ...r.options, placeholderData })),
	);
	return {
		observer,
		drawn: () => plan.draw(observer.getCurrentResult())[0],
	};
}

test("with no organization the ability is deny-all at once, unpainted, with no request", () => {
	const route = mock.fn(async () => ({ rules: packed }));
	register(route);
	const client = new QueryClient();
	const { drawn } = observe(client, ability(undefined));
	const first = drawn();
	assert.equal(first?.painted, false);
	const value = first?.value as { can: (a: string, s: string) => boolean };
	assert.equal(value.can("read", "deploy"), false);
	assert.equal(route.mock.callCount(), 0);
});

test("a gated act paints, never blocked, while the rules wait, then answers from them", async () => {
	let answer = () => {};
	register(
		() =>
			new Promise((resolve) => {
				answer = () => resolve({ rules: packed });
			}),
	);
	const client = new QueryClient();
	const act = { label: "Deploy" };
	const gated = ability("org-1").at((a) =>
		a.can("manage", "deploy") ? act : { ...act, blocked: true },
	);
	const { observer, drawn } = observe(client, gated);
	const waiting = drawn();
	assert.equal(waiting?.painted, true);
	assert.deepEqual(waiting?.value, act);

	const stop = observer.subscribe(() => {});
	await tick();
	answer();
	await tick();
	const settled = drawn();
	assert.equal(settled?.painted, false);
	assert.deepEqual(settled?.value, { label: "Deploy", blocked: true });
	stop();
});

test("a record selection layers over the org rules", async () => {
	register(async () => ({ rules: [] }));
	const client = new QueryClient();
	const record = read({
		queryKey: ["record"],
		queryFn: async () => packed as readonly unknown[] | undefined,
	});
	const { observer, drawn } = observe(
		client,
		ability("org-2", record).at((a) => a.can("read", "deploy")),
	);
	const stop = observer.subscribe(() => {});
	await tick();
	assert.deepEqual(drawn(), { painted: false, value: true });
	stop();
});

test("the rules read is ambient and cached for good", () => {
	const rules = orgRules("org-3");
	assert.equal(rules.options.meta?.["ambient"], true);
	assert.equal(rules.options.staleTime, Infinity);
	assert.deepEqual(rules.options.queryKey, orgRulesQueryKey("org-3"));
});

test("watchUnheld says nothing for an ambient failure, and names an ordinary one", async () => {
	const error = mock.method(console, "error", () => {});
	register(async () => {
		throw new Error("down");
	});
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const stop = watchUnheld(client.getQueryCache());
	const rules = orgRules("org-4");
	const { observer } = observe(client, rules);
	const unobserve = observer.subscribe(() => {});
	await tick();
	assert.equal(error.mock.callCount(), 0);

	const plain = read({
		queryKey: ["plain"],
		queryFn: async () => {
			throw new Error("no");
		},
	});
	const other = observe(client, plain);
	const unobservePlain = other.observer.subscribe(() => {});
	await tick();
	assert.equal(error.mock.callCount(), 1);
	unobserve();
	unobservePlain();
	stop();
	error.mock.restore();
});
