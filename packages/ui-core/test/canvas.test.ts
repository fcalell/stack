import assert from "node:assert/strict";
import { test } from "node:test";
import { icons } from "lucide";
import {
	backEdges,
	HANDOFF_GLYPH,
	pathOrder,
	spokenNames,
} from "../src/canvas.ts";
import type { CanvasEdge, CanvasNode } from "../src/descriptors.ts";
import { ROSTER, rosterEntries } from "../src/roster.ts";
import { ENGLISH } from "../src/tokens.ts";

// `from>to` edges, numbered in order: the Nth is `eN`.
function graph(ids: string, edgeList: string) {
	const nodes = ids.split(" ").filter(Boolean);
	const edges = edgeList
		.split(" ")
		.filter(Boolean)
		.map((each, index) => {
			const [from = "", to = ""] = each.split(">");
			return { id: `e${index + 1}`, from, to };
		});
	return { nodes: nodes.map((id) => ({ id })), edges };
}

const orders: Array<[string, string, string, string, string]> = [
	[
		"journey, three legs and a rejoin",
		"S1 A1 B1 B2 A2 R T",
		"S1>A1 S1>B1 A1>A2 B1>B2 A2>R B2>R R>T",
		"S1 A1 A2 B1 B2 R T",
		"",
	],
	[
		"workflow: a loop and a gate's answer upstream",
		"T P B C G D",
		"T>P P>B B>C C>B C>G G>P G>D",
		"T P B C G D",
		"e4 e6",
	],
	[
		"two roots rejoining",
		"R1 X R2 Y Z",
		"R1>X R2>Y X>Z Y>Z",
		"R1 X R2 Y Z",
		"",
	],
	["root not first in the array", "X R", "R>X", "R X", ""],
	["a disconnected node", "A B Q", "A>B", "A B Q", ""],
	["a ring with no root", "A B C", "A>B B>C C>A", "A B C", "e3"],
	["a ring beside a root", "R A B", "A>B B>A", "R A B", "e2"],
	["a self-loop and an unknown id", "A B", "A>A A>B B>ghost", "A B", "e1"],
	["out-edge array order beats node order", "S X Y", "S>Y S>X", "S Y X", ""],
	[
		"rejoin after a deeper predecessor",
		"S A B C J",
		"S>A S>B A>J B>C C>J",
		"S A B C J",
		"",
	],
	["a parallel edge", "A B", "A>B A>B", "A B", ""],
	["empty graph", "", "", "", ""],
];

for (const [name, ids, edgeList, order, back] of orders) {
	test(`pathOrder and backEdges: ${name}`, () => {
		const { nodes, edges } = graph(ids, edgeList);
		const got = pathOrder(nodes, edges);
		assert.deepEqual(got, order.split(" ").filter(Boolean));
		assert.equal(got.length, nodes.length);
		assert.equal(new Set(got).size, nodes.length);
		assert.deepEqual(backEdges(got, edges), back.split(" ").filter(Boolean));
	});
}

test("the journey numbers its nodes 1 to 7 from the path order", () => {
	const { nodes, edges } = graph(
		"S1 A1 B1 B2 A2 R T",
		"S1>A1 S1>B1 A1>A2 B1>B2 A2>R B2>R R>T",
	);
	const number = new Map(pathOrder(nodes, edges).map((id, at) => [id, at + 1]));
	assert.deepEqual(
		["S1", "A1", "A2", "B1", "B2", "R", "T"].map((id) => number.get(id)),
		[1, 2, 3, 4, 5, 6, 7],
	);
});

function node(id: string, rest: Partial<CanvasNode>): CanvasNode {
	return { id, icon: "Check", title: id, ...rest };
}

function edge(from: string, to: string, label?: string): CanvasEdge {
	return { id: `${from}>${to}`, from, to, ...(label ? { label } : {}) };
}

const ship = node("sh", { title: "Ship" });
const implement = node("im", { title: "Implement" });

const spoken: Array<
	[
		string,
		CanvasNode,
		CanvasEdge[],
		string,
		{ off: string; next: string } | undefined,
	]
> = [
	[
		"every part",
		node("rv", {
			number: 3,
			overline: "Reviewer",
			title: "Review",
			line: "Checks the diff",
			status: { state: "done", label: "Done" },
		}),
		[edge("rv", "sh", "approve"), edge("rv", "im", "request changes")],
		"3, Reviewer, Review, Checks the diff, Done, Next: approve, Ship; request changes, Implement",
		undefined,
	],
	["a title alone", implement, [], "Implement", undefined],
	[
		"an edge with no label",
		ship,
		[edge("sh", "im")],
		"Ship, Next: Implement",
		undefined,
	],
	[
		"off",
		node("lint", {
			title: "Lint",
			overline: "Check",
			line: "Runs lint",
			off: true,
		}),
		[],
		"Check, Lint, Off",
		undefined,
	],
	[
		"a problem",
		node("build", {
			title: "Build",
			line: "Runs the build",
			problem: "Missing token",
		}),
		[],
		"Build, Runs the build, Missing token",
		undefined,
	],
	[
		"a count",
		node("fan", { title: "Fan out", count: 4 }),
		[],
		"4, Fan out",
		undefined,
	],
	[
		"a number over a count",
		node("fan", { title: "Fan out", number: 2, count: 4 }),
		[],
		"2, Fan out",
		undefined,
	],
	["an unknown target", ship, [edge("sh", "ghost")], "Ship", undefined],
	[
		"other words, off",
		node("lint", { title: "Lint", overline: "Check", off: true }),
		[],
		"Check, Lint, Aus",
		{ off: "Aus", next: "Weiter" },
	],
	[
		"other words, next",
		ship,
		[edge("sh", "im", "ok")],
		"Ship, Weiter: ok, Implement",
		{ off: "Aus", next: "Weiter" },
	],
];

for (const [name, subject, edges, want, words] of spoken) {
	test(`spokenNames: ${name}`, () => {
		const nodes = [subject, ship, implement].filter(
			(each, at, all) => all.findIndex((other) => other.id === each.id) === at,
		);
		const got = spokenNames(nodes, edges, words ?? ENGLISH).get(subject.id);
		assert.equal(got, want);
	});
}

test("Canvas is a web-only roster entry with the descriptor's props", () => {
	const canvas = ROSTER.content.Canvas;
	assert.ok(canvas);
	assert.deepEqual(canvas.props, [
		"label",
		"nodes",
		"edges",
		"groups",
		"selected",
		"onSelect",
		"path",
		"onMove",
		"onConnect",
		"act",
	]);
	assert.deepEqual(canvas.platforms, ["web"]);
	const has = (platform?: "web" | "native") =>
		rosterEntries(platform).some(([, name]) => name === "Canvas");
	assert.equal(has("native"), false);
	assert.equal(has("web"), true);
	assert.equal(has(), true);
	assert.ok(HANDOFF_GLYPH in icons);
});
