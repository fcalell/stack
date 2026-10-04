import assert from "node:assert/strict";
import { test } from "node:test";
import type { MessageDetail } from "../src/descriptors.ts";
import { ROSTER } from "../src/roster.ts";

test("a system message's detail is a row, a free act's code, or a fold", () => {
	const details: MessageDetail[] = [
		{
			row: {
				leading: { icon: "FileText" },
				title: "Weekly digest",
				meta: ["Note", "Edited today"],
				status: { state: "active", label: "Drafting" },
				chip: { family: "teal", label: "Docs" },
				href: "/notes/digest",
			},
		},
		{ code: "deploy api --env production" },
		{ fold: "README.md\nsrc/index.ts" },
	];
	// @ts-expect-error: a row names what it holds
	const untitled: MessageDetail = { row: { meta: ["Note"] } };
	// @ts-expect-error: a free act's arguments are text
	const figures: MessageDetail = { code: 4 };
	// @ts-expect-error: a detail is one of the three
	const bare: MessageDetail = {};
	void [details, untitled, figures, bare];
});

test("a detail is exactly one of the three, never two together", () => {
	// @ts-expect-error: a free act's code and a fold together
	const codeAndFold: MessageDetail = { code: "x", fold: "y" };
	// @ts-expect-error: a row and a free act's code together
	const rowAndCode: MessageDetail = { row: { title: "x" }, code: "y" };
	// @ts-expect-error: a row and a fold together
	const rowAndFold: MessageDetail = { row: { title: "x" }, fold: "y" };
	void [codeAndFold, rowAndCode, rowAndFold];
});

test("the roster's Message takes a detail and holds the card and the fold", () => {
	const entry = ROSTER.content.Message;
	assert.ok(entry);
	assert.ok(entry.props.includes("detail"));
	assert.ok(!entry.props.includes("children"));
	for (const cell of ["MESSAGE_CARD", "MESSAGE_FOLD", "TEXT.role.code"])
		assert.ok(entry.draws.includes(cell), cell);
	for (const cell of ["MESSAGE_CARD", "MESSAGE_FOLD"])
		assert.ok(entry.holds?.includes(cell), cell);
	assert.ok(entry.owns?.roles?.includes("code"));
});
