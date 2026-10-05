import assert from "node:assert/strict";
import { test } from "node:test";
import { ROSTER } from "@fcalell/ui-core/roster";
import { createElement } from "react";
import type { AuthColumnProps } from "../src/ui/components/auth-column/index.tsx";

const column = (props: AuthColumnProps) => props;
const act = { label: "x", onAct: () => {} };
const node = createElement("b");

test("an auth column takes its head as data", () => {
	column({ product: "Acme", title: "Sign in" });
	column({ product: "Acme", title: "x", step: { at: 1, of: 2 } });
	column({ product: "Acme", title: "x", sentence: "Signed in as ana" });
	column({
		product: "Acme",
		title: "x",
		sentence: ["We sent a code to ", { strong: "ana@acme.dev" }],
	});
	// @ts-expect-error: a sentence is data, never a node
	column({ product: "Acme", title: "x", sentence: node });
	// @ts-expect-error: the title is the page's one h1
	column({ product: "Acme" });
	// @ts-expect-error: the product leads the column
	column({ title: "Sign in" });
	// @ts-expect-error: the act is a Place's
	column({ product: "Acme", title: "x", act });
	// @ts-expect-error: the foot is a Place's
	column({ product: "Acme", title: "x", foot: "x" });
	// @ts-expect-error: the more menu is a Place's
	column({ product: "Acme", title: "x", more: [] });
	assert.deepEqual(ROSTER.layout.AuthColumn?.props, [
		"product",
		"step",
		"title",
		"sentence",
		"banner",
		"children",
	]);
});
