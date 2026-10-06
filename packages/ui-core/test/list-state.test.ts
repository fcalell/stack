import assert from "node:assert/strict";
import { test } from "node:test";
import type { ChangeKind, TableColumn } from "../src/descriptors.ts";
import {
	boundaryState,
	CHANGE_GLYPH,
	chooseAllToggled,
	chooseHead,
	chooseReason,
	chooseRow,
	definitionShape,
	factShape,
	fileShape,
	folding,
	groupWait,
	type ListInput,
	listBusy,
	listCount,
	listGround,
	listState,
	listWaits,
	meterShape,
	missing,
	pathCut,
	retryOf,
	rowShape,
	sectionCount,
	sectionState,
	tableRecords,
	toggled,
	touchMeta,
	treeMove,
	treeRows,
	treeStop,
	waitingDepth,
	waitLine,
} from "../src/list-state.ts";
import { leadingOf, sizePx } from "../src/scales.ts";
import { ENGLISH } from "../src/tokens.ts";
import {
	changeContentTone,
	LIST_TREE,
	LOCK_GLYPH,
	type RowLines,
	row,
	rowStep,
	rowTitle,
	rowTitleForm,
	TREE_RAIL,
	treeBleed,
} from "../src/variants.ts";

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
		wrap: false,
		tree: false,
		change: false,
		leading: null,
		meta: false,
		chip: false,
		marks: false,
		trailing: false,
		entry: false,
		act: false,
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
	assert.deepEqual(rowShape({ warning: spy("warning") }), {
		...none,
		meta: true,
		marks: true,
	});
	assert.deepEqual(rowShape({ lock: spy("lock") }), {
		...none,
		meta: true,
		marks: true,
	});
	assert.deepEqual(rowShape({ change: spy("change") }), {
		...none,
		change: true,
	});
	// A step list waits as the meta line it replaces.
	assert.deepEqual(rowShape({ steps: spy("steps") }), { ...none, meta: true });
	assert.deepEqual(rowShape({ wrap: true, meta: spy("meta") }), {
		...none,
		wrap: true,
		meta: true,
	});
	assert.equal(rowShape({ wrap: false }).wrap, false);
	// A tree's waiting rows reserve its fold lane, whatever the children are.
	assert.deepEqual(rowShape({ children: spy("children") }), {
		...none,
		tree: true,
	});
	assert.deepEqual(rowShape({ entry: spy("entry"), act: spy("act") }), {
		...none,
		entry: true,
		act: true,
	});
	assert.equal(rowShape({ leading: { icon: spy("icon") } }).leading, "icon");
	assert.equal(
		rowShape({ leading: { status: spy("status") } }).leading,
		"status",
	);
	assert.equal(rowShape({ leading: { check: spy("check") } }).leading, "check");
	assert.deepEqual(meterShape({}), { line: "none" });
	assert.deepEqual(meterShape({ meta: spy("meta") }), { line: "meta" });
	assert.deepEqual(meterShape({ counts: spy("counts") }), { line: "counts" });
	assert.equal(waitLine({ meta: "Of 10", counts: [] }), "counts");
	assert.deepEqual(fileShape({}), { change: false, chip: false });
	assert.deepEqual(fileShape({ chip: spy("chip") }), {
		change: false,
		chip: true,
	});
	assert.deepEqual(fileShape({ change: spy("change") }), {
		change: true,
		chip: false,
	});
	assert.deepEqual(calls, []);
});

test("a waiting definition row's shape comes from the keys a `definition` map declares: copy or an act gives the act's square, a link its chevron, a description or a lock its meta line", () => {
	const calls: string[] = [];
	const spy = (name: string) => () => {
		calls.push(name);
		return undefined;
	};
	assert.deepEqual(definitionShape({}), {
		change: false,
		description: false,
		end: "none",
	});
	assert.deepEqual(
		definitionShape({ change: spy("change"), description: spy("description") }),
		{ change: true, description: true, end: "none" },
	);
	assert.equal(definitionShape({ copyable: true }).end, "act");
	assert.equal(definitionShape({ copyable: false }).end, "none");
	assert.equal(definitionShape({ act: spy("act") }).end, "act");
	assert.equal(definitionShape({ href: spy("href") }).end, "chevron");
	assert.equal(definitionShape({ onOpen: spy("onOpen") }).end, "chevron");
	assert.equal(
		definitionShape({ copyable: true, href: spy("href") }).end,
		"act",
	);
	assert.deepEqual(definitionShape({ locked: spy("locked") }), {
		change: false,
		description: true,
		end: "none",
	});
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
	// A list of facts (`definition`) waits alone: it makes the head busy, adds
	// no count and is no body of rows.
	assert.deepEqual(
		sectionState(
			{
				...none,
				lists: [{ items: [1] }, { query: waiting, definition: true }],
			},
			{},
		),
		{ busy: true, counted: true, count: 1, fields: 0 },
	);
	assert.deepEqual(
		sectionState(
			{ ...none, lists: [{ items: [1], definition: true }] },
			{ loading: true },
		),
		{ busy: true, counted: false, count: undefined, fields: 3 },
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
			warning: (member) => (member.owner ? undefined : "Name conflicts"),
			change: (member) => (member.owner ? "unchanged" : "added"),
		}),
		[
			{
				id: "ana",
				href: "/members/ana",
				locked: ["role"],
				warning: undefined,
				change: "unchanged",
				blocked: undefined,
				moved: undefined,
				cells: { name: "Ana Ruiz", role: "admin", owner: true },
			},
			{
				id: "ben",
				href: "/members/ben",
				locked: undefined,
				warning: "Name conflicts",
				change: "added",
				blocked: undefined,
				moved: undefined,
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
				warning: undefined,
				change: undefined,
				blocked: undefined,
				moved: undefined,
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

test("a change mark has one glyph per kind, named by the kind's own word", () => {
	const kinds: ChangeKind[] = [
		"added",
		"changed",
		"removed",
		"unchanged",
		"stale",
	];
	assert.deepEqual(Object.keys(CHANGE_GLYPH), kinds);
	assert.equal(new Set(Object.values(CHANGE_GLYPH)).size, kinds.length);
	for (const kind of kinds) {
		assert.ok(ENGLISH[kind], `${kind} has a word`);
	}
	assert.equal(ENGLISH.changed, "Changed");
});

test("a change mark's ink is its kind's: added ok, removed danger, changed warn", () => {
	assert.equal(changeContentTone("added"), "ok");
	assert.equal(changeContentTone("removed"), "danger");
	assert.equal(changeContentTone("changed"), "warn");
	assert.equal(changeContentTone("stale"), "warn");
	assert.equal(changeContentTone("unchanged"), "ink-meta");
});

const choosing = (blocked?: string, moved?: string) => ({
	id: "x",
	href: undefined,
	locked: undefined,
	warning: undefined,
	change: undefined,
	blocked,
	moved,
	cells: {},
});
const ROWS = ["a", "b", "c"].map((id) => ({ ...choosing(), id }));
const WITH_BLOCKED = [...ROWS, { ...choosing("Held by CR-12"), id: "d" }];

test("a table's records carry the reasons its choice gives, read from the item", () => {
	const [ana, ben] = tableRecords(
		MEMBERS,
		COLUMNS,
		{ id: (member) => member.id },
		{
			chosen: [],
			onChange: () => {},
			blocked: (member) => (member.owner ? "Owner" : undefined),
			moved: (member) => (member.owner ? undefined : "Needed by Ana"),
		},
	);
	assert.equal(ana?.blocked, "Owner");
	assert.equal(ana?.moved, undefined);
	assert.equal(ben?.blocked, undefined);
	assert.equal(ben?.moved, "Needed by Ana");
});

test("the head tick is unchecked, mixed or checked over the rows that can be ticked", () => {
	assert.equal(chooseHead(ROWS, []), false);
	assert.equal(chooseHead(ROWS, ["b"]), "mixed");
	assert.equal(chooseHead(ROWS, ["a", "b", "c"]), true);
	// A blocked row is outside the head tick, ticked or not.
	assert.equal(chooseHead(WITH_BLOCKED, ["a", "b", "c"]), true);
	assert.equal(chooseHead(WITH_BLOCKED, ["a", "d"]), "mixed");
	assert.equal(chooseHead(WITH_BLOCKED, ["d"]), false);
	// An id the rows do not hold is no row's tick.
	assert.equal(chooseHead(ROWS, ["z"]), false);
	assert.equal(chooseHead([], []), false);
	assert.equal(chooseHead([choosing("Held")], []), false);
});

test("the head tick chooses every tickable row from unchecked or mixed, and clears them from checked", () => {
	assert.deepEqual(chooseAllToggled(ROWS, []), ["a", "b", "c"]);
	assert.deepEqual(chooseAllToggled(ROWS, ["b"]), ["b", "a", "c"]);
	assert.deepEqual(chooseAllToggled(ROWS, ["a", "b", "c"]), []);
	// A blocked row is never chosen by it, and a chosen id the rows do not
	// hold stays.
	assert.deepEqual(chooseAllToggled(WITH_BLOCKED, ["z"]), ["z", "a", "b", "c"]);
	assert.deepEqual(chooseAllToggled(WITH_BLOCKED, ["z", "a", "b", "c"]), ["z"]);
	assert.deepEqual(chooseAllToggled([], ["z"]), ["z"]);
});

test("a row's tick puts its id in the chosen set once, or takes it out", () => {
	assert.deepEqual(chooseRow(["a"], "b", true), ["a", "b"]);
	assert.deepEqual(chooseRow(["a", "b"], "b", true), ["a", "b"]);
	assert.deepEqual(chooseRow(["a", "b"], "a", false), ["b"]);
	assert.deepEqual(chooseRow(["a"], "z", false), ["a"]);
});

test("a row's reason is why it cannot be ticked, else why its tick moved", () => {
	assert.equal(chooseReason(choosing("Held", "Needed by A")), "Held");
	assert.equal(chooseReason(choosing(undefined, "Needed by A")), "Needed by A");
	assert.equal(chooseReason(choosing()), undefined);
});

test("a dim title keeps its ink off the fade: the meta ink at 400, never opacity", () => {
	const strong = rowTitle({ form: "strong" });
	const dim = rowTitle({ form: "dim" });
	assert.match(strong, /font-medium/);
	assert.match(strong, /text-ink-body/);
	assert.match(dim, /font-normal/);
	assert.match(dim, /text-ink-meta/);
	assert.doesNotMatch(dim, /opacity/);
	// A title read whole is body 400 in the body ink, its dim form the meta ink.
	assert.match(rowTitle({ form: "whole" }), /font-normal text-ink-body/);
	assert.match(rowTitle({ form: "whole-dim" }), /text-ink-meta/);
	assert.equal(rowTitleForm(false, false), "strong");
	assert.equal(rowTitleForm(false, true), "dim");
	assert.equal(rowTitleForm(true, false), "whole");
	assert.equal(rowTitleForm(true, true), "whole-dim");
});

test("a step list's running step is in the body ink, the others in the meta ink", () => {
	assert.match(rowStep({ state: "running" }), /text-ink-body/);
	assert.match(rowStep({ state: "rest" }), /text-ink-meta/);
});

interface Node {
	id: string;
	children?: Node[];
}
const TREE: Node[] = [
	{
		id: "a",
		children: [
			{ id: "a1", children: [{ id: "a1x" }, { id: "a1y" }] },
			{ id: "a2", children: [] },
		],
	},
	{ id: "b" },
	{ id: "c", children: [{ id: "c1" }] },
];
const NODES = {
	key: (node: Node) => node.id,
	children: (node: Node) => node.children,
};
const shown = (folded: readonly string[]) =>
	treeRows(TREE, NODES, folded).map((row) => `${row.depth}:${row.key}`);

test("a tree draws each item then its children one depth in, every level open by default", () => {
	assert.deepEqual(shown([]), [
		"0:a",
		"1:a1",
		"2:a1x",
		"2:a1y",
		"1:a2",
		"0:b",
		"0:c",
		"1:c1",
	]);
	assert.deepEqual(treeRows([], NODES, []), []);
});

test("a folded item hides every descendant and keeps its own row", () => {
	assert.deepEqual(shown(["a"]), ["0:a", "0:b", "0:c", "1:c1"]);
	assert.deepEqual(shown(["a1"]), [
		"0:a",
		"1:a1",
		"1:a2",
		"0:b",
		"0:c",
		"1:c1",
	]);
	// A folded descendant stays folded under an open parent, and a key no item
	// holds changes nothing.
	assert.deepEqual(shown(["a1", "a", "zzz"]), ["0:a", "0:b", "0:c", "1:c1"]);
});

test("only an item with children is a branch, and a row says whether its children are drawn", () => {
	const rows = treeRows(TREE, NODES, ["a1"]);
	const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
	assert.equal(byKey.a?.branch, true);
	assert.equal(byKey.a?.open, true);
	assert.equal(byKey.a1?.branch, true);
	assert.equal(byKey.a1?.open, false);
	// No children, or an empty list, is a leaf.
	assert.equal(byKey.b?.branch, false);
	assert.equal(byKey.a2?.branch, false);
	assert.equal(byKey.a?.item, TREE[0]);
});

// The visible rows of TREE with every branch open:
// 0 a, 1 a1, 2 a1x, 3 a1y, 4 a2, 5 b, 6 c, 7 c1.
const walk = (folded: readonly string[], from: string, key: string) => {
	const rows = treeRows(TREE, NODES, folded);
	const at = rows.findIndex((each) => each.key === from);
	const move = treeMove(rows, at, key);
	return move && "focus" in move ? rows[move.focus]?.key : move;
};

test("Down and Up step between the visible rows and stop at the ends", () => {
	assert.equal(walk([], "a", "ArrowDown"), "a1");
	assert.equal(walk([], "a1y", "ArrowDown"), "a2");
	assert.equal(walk([], "c1", "ArrowDown"), undefined);
	assert.equal(walk([], "b", "ArrowUp"), "a2");
	assert.equal(walk([], "a", "ArrowUp"), undefined);
	// A folded branch's children are not visible rows, so Down skips them.
	assert.equal(walk(["a"], "a", "ArrowDown"), "b");
});

test("Home and End go to the first and last visible row", () => {
	assert.equal(walk([], "a1y", "Home"), "a");
	assert.equal(walk([], "a1y", "End"), "c1");
	assert.equal(walk(["c"], "a", "End"), "c");
});

test("Right opens a closed branch, goes to the first child of an open one, and does nothing on a leaf", () => {
	assert.deepEqual(walk(["a1"], "a1", "ArrowRight"), {
		fold: "a1",
		open: true,
	});
	assert.equal(walk([], "a", "ArrowRight"), "a1");
	assert.equal(walk([], "a1", "ArrowRight"), "a1x");
	assert.equal(walk([], "b", "ArrowRight"), undefined);
	// An item with an empty list of children is a leaf.
	assert.equal(walk([], "a2", "ArrowRight"), undefined);
});

test("Left folds an open branch, else goes to the parent, and does nothing on a root", () => {
	assert.deepEqual(walk([], "a1", "ArrowLeft"), { fold: "a1", open: false });
	assert.equal(walk(["a1"], "a1", "ArrowLeft"), "a");
	assert.equal(walk([], "a1y", "ArrowLeft"), "a1");
	assert.equal(walk([], "a2", "ArrowLeft"), "a");
	assert.equal(walk([], "c1", "ArrowLeft"), "c");
	assert.equal(walk([], "b", "ArrowLeft"), undefined);
	assert.equal(walk(["a"], "a", "ArrowLeft"), undefined);
});

test("another key, or a row the tree does not draw, moves nothing", () => {
	assert.equal(walk([], "a", "Enter"), undefined);
	assert.equal(walk([], "a", "x"), undefined);
	assert.equal(treeMove(treeRows(TREE, NODES, []), -1, "ArrowDown"), undefined);
	assert.equal(treeMove([], 0, "End"), undefined);
});

test("a waiting tree's rows stand at a root, a level in, then two levels in", () => {
	assert.deepEqual([0, 1, 2, 3].map(waitingDepth), [0, 1, 2, 2]);
	assert.equal(waitingDepth(4), 0);
});

test("the tree's one tab stop is the active row, else the first", () => {
	const rows = treeRows(TREE, NODES, []);
	assert.equal(treeStop(rows, "a1y"), 3);
	assert.equal(treeStop(rows, undefined), 0);
	// A folded parent hides the active row.
	assert.equal(treeStop(treeRows(TREE, NODES, ["a"]), "a1y"), 0);
	assert.equal(treeStop([], "a"), 0);
});

test("a branch opens or folds by key, keeping the set as it stands", () => {
	assert.deepEqual(folding([], "a", false), ["a"]);
	assert.deepEqual(folding(["a"], "a", true), []);
	assert.deepEqual(folding(["a", "b"], "a", false), ["a", "b"]);
	assert.deepEqual(folding(["b"], "a", true), ["b"]);
});

test("a tree's rail is one indent step with a hairline, and its rows abut", () => {
	assert.match(TREE_RAIL, /\bw-indent\b/);
	assert.match(TREE_RAIL, /\bborder-r border-edge\b/);
	assert.doesNotMatch(LIST_TREE, /\bgap-/);
	assert.equal(sizePx("desktop", "indent"), 16);
	assert.equal(sizePx("touch", "indent"), 20);
});

test("a tree row's bleed is its lines form's padding, negated", () => {
	const padding = (lines: RowLines) =>
		row({ lines }).match(/\bpy-(\w+)\b/)?.[1];
	for (const lines of ["one", "two", "setting", "whole"] as const) {
		const bleed = treeBleed({ lines }).match(/-my-(\w+)/)?.[1];
		assert.equal(bleed, padding(lines), lines);
	}
});

test("a body line's box is the body's line box at each density", () => {
	assert.equal(sizePx("desktop", "line-body"), leadingOf("desktop", "body"));
	assert.equal(sizePx("touch", "line-body"), leadingOf("touch", "body"));
	assert.equal(sizePx("room", "line-body"), leadingOf("room", "body"));
});

test("a lock glyph sets no margin of its own", () => {
	assert.doesNotMatch(LOCK_GLYPH, /\bm[se]?-/);
});

test("a touch row's meta leads with the change value and the move's reason after it in one part, then the other values", () => {
	const values = [
		{ changed: false, part: "0 3 * * *" },
		{ changed: true, part: "30s → 60s" },
		{ changed: false, part: "Retries 3" },
	];
	assert.deepEqual(touchMeta(values, "Needed by Usage rollup"), [
		"30s → 60s · Needed by Usage rollup",
		"0 3 * * *",
		"Retries 3",
	]);
	assert.deepEqual(touchMeta(values, undefined), [
		"30s → 60s",
		"0 3 * * *",
		"Retries 3",
	]);
	assert.deepEqual(touchMeta([], "Needed by Usage rollup"), [
		"Needed by Usage rollup",
	]);
	assert.deepEqual(touchMeta([], undefined), []);
});

test("a several-pick toggles a member in and out, keeping order", () => {
	assert.deepEqual(toggled(["a", "b"], "c"), ["a", "b", "c"]);
	assert.deepEqual(toggled(["a", "b", "c"], "b"), ["a", "c"]);
	assert.deepEqual(toggled([], "a"), ["a"]);
});

test("a file name keeps its start and its end, and its floor is the cut form", () => {
	assert.deepEqual(pathCut("biome.json"), {
		stem: "bio",
		tail: "me.json",
		floor: 10,
	});
	assert.deepEqual(pathCut("flags.md"), {
		stem: "fla",
		tail: "gs.md",
		floor: 8,
	});
	assert.deepEqual(pathCut("payment-terms.md"), {
		stem: "payment-te",
		tail: "rms.md",
		floor: 10,
	});
	assert.deepEqual(pathCut("Makefile"), {
		stem: "Mak",
		tail: "efile",
		floor: 8,
	});
	assert.deepEqual(pathCut("a"), { stem: "a", tail: "", floor: 1 });
});
