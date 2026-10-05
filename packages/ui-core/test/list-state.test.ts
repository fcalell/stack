import assert from "node:assert/strict";
import { test } from "node:test";
import type { TableColumn } from "../src/descriptors.ts";
import {
	boundaryState,
	factShape,
	fileShape,
	groupWait,
	type ListInput,
	listBusy,
	listCount,
	listGround,
	listState,
	listWaits,
	meterShape,
	missing,
	retryOf,
	rowShape,
	sectionCount,
	sectionState,
	tableRecords,
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

test("an error carrying stack's NOT_FOUND code or an HTTP 404 answers not found; any other error does not", () => {
	assert.equal(missing({ error: { code: "NOT_FOUND", status: 404 } }), true);
	assert.equal(missing({ error: { code: "NOT_FOUND" } }), true);
	assert.equal(missing({ error: { status: 404 } }), true);
	assert.equal(missing({ error: { code: "INTERNAL_SERVER_ERROR" } }), false);
	assert.equal(missing({ error: { status: 500 } }), false);
	assert.equal(missing({ error: new Error("NOT_FOUND") }), false);
	assert.equal(missing({ error: "NOT_FOUND" }), false);
	assert.equal(missing({ error: null }), false);
	assert.equal(missing({}), false);
});

test("a query that answers not found draws its missing form, never its failure", () => {
	const notFound = { ...query(false, true, undefined), error: { status: 404 } };
	assert.equal(listState({ ...base, query: notFound }), "missing");
	assert.equal(
		listState({
			...base,
			query: { ...query(false, true, undefined), error: { status: 503 } },
		}),
		"failed",
	);
	assert.equal(
		listState({ ...base, query: { ...notFound, isError: false, data: [1] } }),
		"loaded",
	);
	assert.equal(listCount({ ...base, query: notFound }), undefined);
});

test("a QueryBoundary draws its missing form only when every failed query answers not found", () => {
	const ok = { isError: false };
	const notFound = { isError: true, error: { code: "NOT_FOUND" } };
	const down = { isError: true, error: { status: 503 } };
	assert.equal(boundaryState([ok]), "loaded");
	assert.equal(boundaryState([notFound]), "missing");
	assert.equal(boundaryState([ok, notFound]), "missing");
	assert.equal(boundaryState([notFound, notFound]), "missing");
	assert.equal(boundaryState([notFound, down]), "failed");
	assert.equal(boundaryState([down]), "failed");
	assert.equal(boundaryState([{ isError: true }]), "failed");
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
		marks: false,
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
		marks: true,
	});
	assert.deepEqual(rowShape({ chip: spy("chip") }), {
		...none,
		meta: true,
		chip: true,
		marks: true,
	});
	assert.equal(rowShape({ leading: { icon: spy("icon") } }).leading, "icon");
	assert.equal(
		rowShape({ leading: { status: spy("status") } }).leading,
		"status",
	);
	assert.deepEqual(meterShape({}), { meta: false });
	assert.deepEqual(meterShape({ meta: spy("meta") }), { meta: true });
	assert.deepEqual(meterShape({ counts: spy("counts") }), { meta: true });
	assert.deepEqual(fileShape({}), { chip: false });
	assert.deepEqual(fileShape({ chip: spy("chip") }), { chip: true });
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

test("a Section's head and loading body follow from its own props and the parts its body holds", () => {
	const none = { lists: [], waits: [], groups: 0, fields: 0 };
	const answered = { isPending: false, isError: false, data: [1, 2] };
	const waiting = { isPending: true, isError: false, data: undefined };
	// Its lists' total once each answers, none while one waits.
	assert.deepEqual(
		sectionState({ ...none, lists: [{ query: answered }, { items: [1] }] }, {}),
		{ busy: false, counted: true, count: 3, fields: 0 },
	);
	assert.deepEqual(
		sectionState(
			{ ...none, lists: [{ query: answered }, { query: waiting }] },
			{},
		),
		{ busy: true, counted: true, count: undefined, fields: 0 },
	);
	// Its own count wins; another waiter makes the head busy.
	assert.deepEqual(sectionState({ ...none, waits: [true] }, { count: 11 }), {
		busy: true,
		counted: true,
		count: 11,
		fields: 0,
	});
	// Loading: a body of rows waits as its own rows, fields as one skeleton
	// each, any other body as three; a loading Section's lists count none yet.
	assert.equal(
		sectionState({ ...none, groups: 1 }, { loading: true }).fields,
		0,
	);
	assert.equal(
		sectionState({ ...none, fields: 2 }, { loading: true }).fields,
		2,
	);
	assert.equal(sectionState(none, { loading: true }).fields, 3);
	assert.equal(sectionState({ ...none, fields: 2 }, {}).fields, 0);
	assert.equal(
		sectionState({ ...none, lists: [{ items: [1] }] }, { loading: true }).count,
		undefined,
	);
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

test("a pending Comparison with three columns draws three bars per row, a chips bar only when chips are declared and a status bar only when status is", () => {
	const calls: string[] = [];
	const chips = () => {
		calls.push("chips");
		return undefined;
	};
	const status = () => {
		calls.push("status");
		return undefined;
	};
	const columns = ["Free", "Team", "Business"];
	assert.deepEqual(factShape(columns, {}), {
		values: 3,
		chips: false,
		status: false,
	});
	assert.deepEqual(factShape(columns, { chips }), {
		values: 3,
		chips: true,
		status: false,
	});
	assert.deepEqual(factShape(columns, { status }), {
		values: 3,
		chips: false,
		status: true,
	});
	assert.deepEqual(factShape(columns, { chips, status }), {
		values: 3,
		chips: true,
		status: true,
	});
	assert.equal(factShape(["Team", "Business"], {}).values, 2);
	assert.deepEqual(calls, []);
});

interface Member {
	id: string;
	name: string;
	role: string;
	owner: boolean;
}

const MEMBERS: Member[] = [
	{ id: "ana", name: "Ana Ruiz", role: "admin", owner: true },
	{ id: "ben", name: "Ben Kaya", role: "member", owner: false },
];
const COLUMNS: TableColumn<Member>[] = [
	{ key: "name", label: "Name", cell: (member) => member.name },
	{ key: "role", label: "Role", cell: (member) => member.role || null },
	{
		key: "owner",
		label: "Owner",
		kind: "check",
		cell: (member) => member.owner,
	},
];

test("a table's rows read each column's cell and the row map from the item", () => {
	assert.deepEqual(
		tableRecords(MEMBERS, COLUMNS, {
			id: (member) => member.id,
			href: (member) => `/members/${member.id}`,
			locked: (member) => (member.owner ? ["role"] : undefined),
		}),
		[
			{
				id: "ana",
				href: "/members/ana",
				locked: ["role"],
				cells: { name: "Ana Ruiz", role: "admin", owner: true },
			},
			{
				id: "ben",
				href: "/members/ben",
				locked: undefined,
				cells: { name: "Ben Kaya", role: "member", owner: false },
			},
		],
	);
	assert.deepEqual(
		tableRecords(MEMBERS.slice(0, 1), COLUMNS, { id: (m) => m.id }),
		[
			{
				id: "ana",
				href: undefined,
				locked: undefined,
				cells: { name: "Ana Ruiz", role: "admin", owner: true },
			},
		],
	);
});

test("a Table whose query failed draws the failed form, and its Retry refetches", () => {
	let calls = 0;
	const failed = {
		isPending: false,
		isError: true,
		data: undefined,
		refetch: () => {
			calls++;
		},
	};
	const input = { ...base, query: failed, inSection: true };
	assert.equal(listState(input), "failed");
	assert.equal(listCount(input), undefined);
	retryOf(failed)();
	assert.equal(calls, 1);
});
