import assert from "node:assert/strict";
import { test } from "node:test";
import { QueriesObserver, QueryClient } from "@tanstack/react-query";
import {
	combine,
	isPlaceholder,
	isSelection,
	placeholderData,
	planSelections,
	type Read,
	read,
} from "../src/read.ts";

// The placeholder answers every key, so a test reads it as anything.
// biome-ignore lint/suspicious/noExplicitAny: that is what the placeholder is
const P: any = placeholderData();

type Row = {
	n: number;
	message: string;
	steps: number[];
	items: unknown[];
	ok: boolean;
};

function make(key: string, data?: Partial<Row>): Read<Row> {
	return read({ queryKey: [key], queryFn: async () => data as Row });
}

// Runs the plan's reads through a real QueriesObserver, as `useQueries` does.
function observe(client: QueryClient, values: unknown[]) {
	const plan = planSelections(values);
	const observer = new QueriesObserver(
		client,
		plan.reads.map((r) => ({ ...r.options, placeholderData })),
	);
	const drawn = () => plan.draw(observer.getCurrentResult());
	return { plan, observer, drawn };
}

test("the placeholder is every key of itself and a number of zero", () => {
	assert.equal(P.a.b.c, P);
	assert.equal(P(1, 2), P);
	assert.equal(
		P.map((x: unknown) => x),
		P,
	);
	assert.equal(P.filter(Boolean), P);
	assert.equal("anything" in P, true);
	assert.deepEqual(Object.entries(P), []);
	assert.deepEqual([...P], []);
	assert.equal(P.then, undefined);
	assert.equal(P.toJSON, undefined);
	assert.equal(P > 0, false);
	assert.equal(P < 0, false);
	assert.equal(new Intl.NumberFormat("en").format(P), "0");
	assert.equal(Reflect.set(P, "x", 1), false);
	assert.equal(Reflect.deleteProperty(P, "x"), false);
	assert.equal(Reflect.defineProperty(P, "x", { value: 1 }), false);
});

test("the placeholder is the epoch as a date and a mark as a string", () => {
	assert.equal(new Date(P).getTime(), 0);
	assert.equal(isPlaceholder(P), true);
	assert.equal(isPlaceholder(`${P}`), true);
	assert.equal(isPlaceholder(`deploy ${P.name} done`), true);
	assert.equal(isPlaceholder("deploy"), false);
	assert.equal(isPlaceholder(undefined), false);
	assert.equal(isPlaceholder({}), false);
});

test("at and combine compose, and a read is its own selection", () => {
	const a = make("a");
	const b = make("b");
	assert.equal(isSelection(a), true);
	assert.equal(isSelection({}), false);
	const sum = combine([a.at((x) => x.n), b], (n, y) => n + y.n);
	const plan = planSelections([sum, a.at((x) => x.n * 2)]);
	assert.equal(plan.reads.length, 2);
	const real = [
		{ data: { n: 1 }, isPlaceholderData: false },
		{ data: { n: 10 }, isPlaceholderData: false },
	];
	assert.deepEqual(plan.draw(real), [
		{ painted: false, value: 11 },
		{ painted: false, value: 2 },
	]);
});

test("planSelections dedupes reads by key and leaves constants alone", () => {
	const a = make("a");
	const again = make("a");
	const plan = planSelections([a, again.at((x) => x.n), "constant", 3]);
	assert.equal(plan.reads.length, 1);
	assert.deepEqual(
		plan.draw([{ data: { n: 4 }, isPlaceholderData: false }]).map((d) => d),
		[
			{ painted: false, value: { n: 4 } },
			{ painted: false, value: 4 },
			{ painted: false, value: "constant" },
			{ painted: false, value: 3 },
		],
	);
});

test("draw paints over a waiting read, then draws real data", async () => {
	const client = new QueryClient();
	const deploy = make("deploy", { message: "ship it", steps: [1, 2] });
	const { drawn, observer } = observe(client, [
		deploy.at((d) => d.message),
		deploy.at((d) => d.steps.length),
		"fixed",
	]);
	const first = drawn();
	assert.equal(first[0]?.painted, true);
	assert.equal(isPlaceholder(first[0]?.value), true);
	assert.equal(first[1]?.painted, true);
	assert.equal(first[2]?.painted, false);

	const unsubscribe = observer.subscribe(() => {});
	await client.fetchQuery(deploy.options);
	assert.deepEqual(drawn(), [
		{ painted: false, value: "ship it" },
		{ painted: false, value: 2 },
		{ painted: false, value: "fixed" },
	]);
	unsubscribe();
});

test("an idle or failed read paints too", async () => {
	const client = new QueryClient();
	const idle = read({
		queryKey: ["idle"],
		queryFn: async () => 1,
		enabled: false,
	});
	const failing = read({
		queryKey: ["failing"],
		queryFn: async () => {
			throw new Error("no");
		},
		retry: false,
	});
	const { drawn, observer } = observe(client, [idle, failing]);
	const unsubscribe = observer.subscribe(() => {});
	await client.prefetchQuery(failing.options);
	assert.deepEqual(
		drawn().map((d) => d.painted),
		[true, true],
	);
	unsubscribe();
});

test("a selector that throws over the placeholder gives it, with a warning", () => {
	const warn = console.warn;
	const warned: unknown[] = [];
	console.warn = (...args) => warned.push(args);
	try {
		const bad = make("a").at((x) => {
			if (x === undefined || isPlaceholder(x)) throw new Error("boom");
			return x.n;
		});
		const plan = planSelections([bad]);
		const waiting = plan.draw([{ data: P, isPlaceholderData: true }]);
		assert.deepEqual(waiting, [{ painted: true, value: P }]);
		const idle = plan.draw([{ data: undefined, isPlaceholderData: false }]);
		assert.deepEqual(idle, [{ painted: true, value: P }]);
		assert.equal(warned.length, 2);
	} finally {
		console.warn = warn;
	}
});

test("a selector that throws over real data rethrows", () => {
	const bug = make("a").at(() => {
		throw new Error("bug");
	});
	assert.throws(
		() =>
			planSelections([bug]).draw([
				{ data: { n: 1 }, isPlaceholderData: false },
			]),
		/bug/,
	);
});

test("combine over a placeholder takes its default branch", () => {
	const a = make("a");
	const b = make("b");
	const both = combine([a, b], (x, y) =>
		x.items.length > 0 && y.ok ? "ready" : "none",
	);
	const [drawn] = planSelections([both]).draw([
		{ data: P, isPlaceholderData: true },
		{ data: P, isPlaceholderData: true },
	]);
	assert.deepEqual(drawn, { painted: true, value: "none" });
});
