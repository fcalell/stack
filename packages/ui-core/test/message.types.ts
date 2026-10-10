import type { MessageDetail } from "../src/descriptors.ts";

// A system message's detail is a row, a free act's code, or a fold.
export const details: MessageDetail[] = [
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
export const untitled: MessageDetail = { row: { meta: ["Note"] } };
// @ts-expect-error: a free act's arguments are text
export const figures: MessageDetail = { code: 4 };
// @ts-expect-error: a detail is one of the three
export const bare: MessageDetail = {};

// A detail is exactly one of the three, never two together.
// @ts-expect-error: a free act's code and a fold together
export const codeAndFold: MessageDetail = { code: "x", fold: "y" };
// @ts-expect-error: a row and a free act's code together
export const rowAndCode: MessageDetail = { row: { title: "x" }, code: "y" };
// @ts-expect-error: a row and a fold together
export const rowAndFold: MessageDetail = { row: { title: "x" }, fold: "y" };
