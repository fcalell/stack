import assert from "node:assert/strict";
import { test } from "node:test";
import { createWidthClaims } from "../src/ui/lib/measure.ts";

test("the column is whole while any claimant is mounted", () => {
	const claims = createWidthClaims();
	assert.equal(claims.whole(), false);
	const table = claims.claim();
	const columns = claims.claim();
	table();
	assert.equal(claims.whole(), true);
	columns();
	assert.equal(claims.whole(), false);
});

test("a table that mounts before the one it replaces is disposed keeps the column", () => {
	const claims = createWidthClaims();
	const before = claims.claim();
	claims.claim();
	before();
	before();
	assert.equal(claims.whole(), true);
});
