import assert from "node:assert/strict";
import { test } from "node:test";
import { selectedRoute } from "../src/ui/lib/places.ts";

const ORG = ["/acme", "/acme/settings"];

test("the place whose route is the address is selected", () => {
	assert.equal(selectedRoute(ORG, "/acme"), "/acme");
	assert.equal(selectedRoute(ORG, "/acme/settings"), "/acme/settings");
});

test("the longest prefix wins over a shorter one", () => {
	assert.equal(selectedRoute(ORG, "/acme/settings/members"), "/acme/settings");
	assert.equal(selectedRoute(ORG, "/acme/projects/shop"), "/acme");
});

test("a place at / holds every address no other place claims", () => {
	assert.equal(selectedRoute(["/", "/inbox"], "/elsewhere"), "/");
	assert.equal(selectedRoute(["/", "/inbox"], "/inbox/3"), "/inbox");
});

test("a prefix counts only at a segment boundary", () => {
	assert.equal(selectedRoute(ORG, "/acmecorp"), undefined);
});
