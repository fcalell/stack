import assert from "node:assert/strict";
import { test } from "node:test";
import { isTabbable, trackHold } from "../src/ui/lib/focus.ts";

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

type Listener = (event: Event) => void;

// A document's listener registry, which node has no DOM to supply.
function fakeDocument() {
	const listeners = new Map<string, Listener>();
	return {
		addEventListener: (type: string, fn: Listener) => listeners.set(type, fn),
		removeEventListener: (type: string) => listeners.delete(type),
		fire: (type: string, target: unknown) =>
			listeners.get(type)?.({ type, target } as unknown as Event),
		count: () => listeners.size,
	};
}

test("focus or a press inside the region holds it, outside ends the hold", () => {
	const inside = {};
	const region = { contains: (node: unknown) => node === inside };
	const doc = fakeDocument();
	const hold = { current: false };
	trackHold(doc as never, () => region as never, hold);
	doc.fire("focusin", inside);
	assert.equal(hold.current, true);
	doc.fire("pointerdown", {});
	assert.equal(hold.current, false);
	doc.fire("pointerdown", inside);
	assert.equal(hold.current, true);
	doc.fire("focusin", {});
	assert.equal(hold.current, false);
});

test("a region not yet mounted holds nothing, and the cleanup removes both listeners", () => {
	const doc = fakeDocument();
	const hold = { current: true };
	const stop = trackHold(doc as never, () => null, hold);
	doc.fire("focusin", {});
	assert.equal(hold.current, false);
	stop();
	assert.equal(doc.count(), 0);
});
