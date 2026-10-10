import assert from "node:assert/strict";
import { test } from "node:test";
import { backEdges, pathOrder } from "../src/canvas.ts";

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
