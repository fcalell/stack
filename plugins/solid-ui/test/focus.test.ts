import assert from "node:assert/strict";
import { test } from "node:test";
import { focusIsFree } from "../src/ui/lib/focus.ts";

// The document's focus as the browser reports it: `activeElement` is the
// body when nothing holds focus.
function page() {
	const body = { isConnected: true } as Element;
	const document = { body };
	Object.assign(body, { ownerDocument: document });
	const element = (connected: boolean) =>
		({ isConnected: connected, ownerDocument: document }) as Element;
	return { body, element };
}

test("a step drawn after its predecessor's button left takes focus", () => {
	const { body, element } = page();
	assert.equal(focusIsFree(null), true);
	assert.equal(focusIsFree(body), true);
	assert.equal(focusIsFree(element(false)), true);
});

test("a control drawn while the viewer is in a field leaves focus there", () => {
	const { element } = page();
	assert.equal(focusIsFree(element(true)), false);
});
