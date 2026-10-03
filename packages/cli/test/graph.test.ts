import assert from "node:assert/strict";
import { test } from "node:test";
import { buildGraph, type GraphCtxFactory } from "../src/lib/graph.ts";
import { createLogContext } from "../src/lib/prompt.ts";
import { slot } from "../src/lib/slots.ts";

const ctx: GraphCtxFactory = {
	app: { name: "app", domain: "example.com" },
	cwd: process.cwd(),
	log: createLogContext(),
	ctxForPlugin: () => {
		throw new Error("unused");
	},
};

// Two installed copies of a package each declare the slot, under one name.
test("a contribution to a second copy of a slot fails rather than vanishing", async () => {
	const ours = slot.list<string>({ source: "cli", name: "files" });
	const theirs = slot.list<string>({ source: "cli", name: "files" });
	const graph = buildGraph(
		[{ name: "react", contributes: [theirs.contribute(() => "a")] }],
		ctx,
	);
	await assert.rejects(async () => graph.resolve(ours), /installed/);
});
