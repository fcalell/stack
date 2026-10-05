import assert from "node:assert/strict";
import { test } from "node:test";
import { isTabbable } from "../src/ui/lib/focus.ts";

interface Fake {
	tabIndex: number;
	disabled?: boolean;
	hiddenAncestor?: boolean;
	visible?: boolean;
}

// The members `isTabbable` reads, which node has no DOM to supply.
function element(fake: Fake): HTMLElement {
	return {
		tabIndex: fake.tabIndex,
		disabled: fake.disabled,
		closest: () => (fake.hiddenAncestor ? {} : null),
		checkVisibility: () => fake.visible ?? true,
	} as unknown as HTMLElement;
}

test("a tab stop of 0 or more is tabbable, whatever the element", () => {
	assert.equal(isTabbable(element({ tabIndex: 0 })), true);
	assert.equal(isTabbable(element({ tabIndex: 3 })), true);
});

test("a roving group's other members (tab index -1) are not", () => {
	assert.equal(isTabbable(element({ tabIndex: -1 })), false);
});

test("a disabled, hidden or unrendered element is not", () => {
	assert.equal(isTabbable(element({ tabIndex: 0, disabled: true })), false);
	assert.equal(
		isTabbable(element({ tabIndex: 0, hiddenAncestor: true })),
		false,
	);
	assert.equal(isTabbable(element({ tabIndex: 0, visible: false })), false);
});
