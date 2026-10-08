import assert from "node:assert/strict";
import { test } from "node:test";
import { ROSTER } from "@fcalell/ui-core/roster";
import { createElement } from "react";
import type { GateProps } from "../src/ui/components/gate/index.tsx";

const gate = (props: GateProps) => props;
const act = { label: "x", onAct: () => {} };
const node = createElement("b");

test("a gate takes its head as data", () => {
	gate({ title: "Sign in" });
	gate({ title: "x", step: { at: 1, of: 2 } });
	gate({ title: "x", mark: { src: "/mark.png", name: "Acme" } });
	gate({ title: "x", mark: { name: "Acme" } });
	gate({
		title: "x",
		description: ["We sent a code to ", { strong: "ana@acme.dev" }],
	});
	// @ts-expect-error: a description is data, never a node
	gate({ title: "x", description: node });
	// @ts-expect-error: a description is runs, never one string
	gate({ title: "x", description: "Signed in as ana" });
	// @ts-expect-error: the mark names itself
	gate({ title: "x", mark: { src: "/mark.png" } });
	// no title: a first run, the EmptyState's title is the page's header
	gate({});
	gate({ children: node });
	// @ts-expect-error: a lead comes only with a title
	gate({ description: ["x"] });
	// @ts-expect-error: a lead comes only with a title
	gate({ step: { at: 1, of: 2 } });
	// @ts-expect-error: a lead comes only with a title
	gate({ mark: { name: "Acme" } });
	// @ts-expect-error: the product is the mark's name
	gate({ title: "x", product: "Acme" });
	// @ts-expect-error: the act is a Place's
	gate({ title: "x", act });
	// @ts-expect-error: the foot is a Place's
	gate({ title: "x", foot: "x" });
	// @ts-expect-error: the more menu is a Place's
	gate({ title: "x", more: [] });
	assert.deepEqual(ROSTER.layout.Gate?.props, [
		"title",
		"description",
		"step",
		"mark",
		"banner",
		"children",
	]);
});
