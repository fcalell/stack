import assert from "node:assert/strict";
import { test } from "node:test";
import { type TitledHead, takeStaticTitle } from "../src/ui/lib/title.ts";

function head(...texts: string[]) {
	const present = new Set(texts.map((_, i) => i));
	const doc: TitledHead = {
		querySelectorAll: () =>
			texts
				.map((text, i) => ({
					textContent: text,
					remove: () => present.delete(i),
				}))
				.filter((_, i) => present.has(i)),
	};
	return { doc, left: () => present.size };
}

test("the static title leaves the head and its text becomes the base title", () => {
	const { doc, left } = head("Martechthings");
	assert.equal(takeStaticTitle(doc), "Martechthings");
	assert.equal(left(), 0, "a static <title> stays first and hides every Title");
});

test("a head without a title gives an empty base", () => {
	assert.equal(takeStaticTitle(head().doc), "");
});
