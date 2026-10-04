import assert from "node:assert/strict";
import { test } from "node:test";
import {
	groupWait,
	type ListInput,
	listBusy,
	listCount,
	listGround,
	listState,
	listWaits,
	retryOf,
	rowShape,
	sectionCount,
} from "../src/list-state.ts";

const refetch = () => {};
const base: ListInput = {
	sectionLoading: false,
	inSection: false,
	hasEmpty: true,
};
const query = (
	isPending: boolean,
	isError: boolean,
	data: readonly unknown[] | undefined,
) => ({ isPending, isError, data, refetch });

test("a pending query, a loading list or a loading Section draws the waiting rows", () => {
	assert.equal(
		listState({ ...base, query: query(true, false, undefined) }),
		"pending",
	);
	assert.equal(listState({ ...base, items: [], loading: true }), "pending");
	assert.equal(
		listState({ ...base, items: [1], sectionLoading: true }),
		"pending",
	);
});

test("a failed query draws its failure", () => {
	assert.equal(
		listState({ ...base, query: query(false, true, undefined) }),
		"failed",
	);
});

test("no item draws the empty form when there is one, else the empty list", () => {
	assert.equal(listState({ ...base, query: query(false, false, []) }), "empty");
	assert.equal(listState({ ...base, items: [] }), "empty");
	assert.equal(listState({ ...base, items: [], hasEmpty: false }), "loaded");
});

test("items draw loaded", () => {
	assert.equal(
		listState({ ...base, query: query(false, false, [1]) }),
		"loaded",
	);
	assert.equal(listState({ ...base, items: [1, 2] }), "loaded");
});

test("a list is busy while its own items wait, except in a Section", () => {
	assert.equal(
		listBusy({ ...base, query: query(true, false, undefined) }),
		true,
	);
	assert.equal(listBusy({ ...base, items: [], loading: true }), true);
	assert.equal(
		listBusy({
			...base,
			query: query(true, false, undefined),
			inSection: true,
		}),
		false,
	);
	assert.equal(listBusy({ ...base, items: [1], sectionLoading: true }), false);
});

test("the waiting shape follows the declared slots and runs none of them", () => {
	const calls: string[] = [];
	const spy = (name: string) => () => {
		calls.push(name);
		return undefined;
	};
	const none = {
		leading: null,
		meta: false,
		chip: false,
		trailing: false,
		more: false,
	};
	assert.deepEqual(rowShape({}), none);
	assert.deepEqual(rowShape({ meta: spy("meta") }), { ...none, meta: true });
	assert.deepEqual(
		rowShape({
			leading: { avatar: spy("leading") },
			trailing: spy("trailing"),
			more: spy("more"),
		}),
		{ ...none, leading: "avatar", trailing: true, more: true },
	);
	assert.deepEqual(rowShape({ status: spy("status") }), {
		...none,
		meta: true,
	});
	assert.deepEqual(rowShape({ chip: spy("chip") }), {
		...none,
		meta: true,
		chip: true,
	});
	assert.equal(rowShape({ leading: { icon: spy("icon") } }).leading, "icon");
	assert.equal(
		rowShape({ leading: { status: spy("status") } }).leading,
		"status",
	);
	assert.deepEqual(calls, []);
});

test("a list's own items wait on its query or on `loading`, and a Section registers either", () => {
	assert.equal(
		listWaits({ ...base, query: query(true, false, undefined) }),
		true,
	);
	assert.equal(
		listWaits({ ...base, items: [], loading: true, inSection: true }),
		true,
	);
	assert.equal(listWaits({ ...base, items: [1], sectionLoading: true }), false);
	assert.equal(listWaits({ ...base, query: query(false, false, [1]) }), false);
});

test("Retry refetches the query", () => {
	let calls = 0;
	const retry = retryOf({
		refetch: () => {
			calls++;
		},
	});
	assert.equal(calls, 0);
	retry();
	assert.equal(calls, 1);
});

test("a list reports its item count once its items answer, none while they wait or fail", () => {
	assert.equal(
		listCount({ ...base, query: query(true, false, undefined) }),
		undefined,
	);
	assert.equal(
		listCount({ ...base, query: query(false, true, undefined) }),
		undefined,
	);
	assert.equal(listCount({ ...base, query: query(false, false, [1, 2]) }), 2);
	assert.equal(listCount({ ...base, query: query(false, false, []) }), 0);
	assert.equal(listCount({ ...base, items: [1, 2, 3] }), 3);
	assert.equal(listCount({ ...base, items: [1, 2], loading: true }), undefined);
});

test("a Section shows its own count, else its lists' total once every list has answered, and none for an empty collection", () => {
	assert.equal(sectionCount(11, [3, undefined]), 11);
	assert.equal(sectionCount(undefined, []), undefined);
	assert.equal(sectionCount(undefined, [3, 2]), 5);
	assert.equal(sectionCount(undefined, [3, undefined]), undefined);
	assert.equal(sectionCount(undefined, [0]), undefined);
	assert.equal(sectionCount(undefined, [0, 0]), undefined);
	assert.equal(sectionCount(0, [3]), undefined);
});

test("a List in a Group draws group rows; the same List outside draws list rows", () => {
	assert.equal(listGround(true), "group");
	assert.equal(listGround(false), "list");
});

test("a waiting Group draws its Lists' waiting rows, else setting row skeletons", () => {
	assert.equal(groupWait(1), "rows");
	assert.equal(groupWait(2), "rows");
	assert.equal(groupWait(0), "settings");
});
