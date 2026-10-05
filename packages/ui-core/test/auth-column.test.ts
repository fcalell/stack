import assert from "node:assert/strict";
import { test } from "node:test";
import { ROSTER, rosterEntries } from "../src/roster.ts";
import { WIDTH_VALUE } from "../src/tokens.ts";
import { AUTH_COLUMN, AUTH_HEAD, AUTH_PAGE } from "../src/variants.ts";

test("the auth column is a layout frame at the auth width", () => {
	const column = ROSTER.layout.AuthColumn;
	assert.ok(column);
	assert.deepEqual(column.props, [
		"product",
		"step",
		"title",
		"sentence",
		"banner",
		"children",
	]);
	assert.match(AUTH_COLUMN, /\bw-full\b/);
	assert.match(AUTH_COLUMN, /\bmax-w-auth\b/);
	assert.equal(WIDTH_VALUE.auth, "400px");
	for (const cell of ["AUTH_PAGE", "AUTH_COLUMN", "AUTH_HEAD"]) {
		assert.ok(column.holds?.includes(cell), `AuthColumn holds ${cell}`);
		const holders = rosterEntries()
			.filter(([, , entry]) => entry.holds?.includes(cell))
			.map(([, name]) => name);
		assert.deepEqual(holders, ["AuthColumn"]);
	}
	// The head is a pair apart and the page the surface at the page inset.
	assert.match(AUTH_HEAD, /\bgap-pair\b/);
	assert.match(AUTH_PAGE, /\bbg-surface\b/);
	assert.match(AUTH_PAGE, /\bp-page\b/);
});
