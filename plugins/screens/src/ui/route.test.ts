import assert from "node:assert/strict";
import { test } from "node:test";
import { defineFixtures } from "./fixtures.ts";
import { routeUrl, withSearch } from "./route.ts";

test("the fixtures' example search follows the route's URL, with or without its ?", () => {
	const url = routeUrl("/connect/$org", "/connect/$org", { org: "acme" });
	assert.equal(
		withSearch(url, "?token=abc&x=1"),
		"/connect/acme?token=abc&x=1",
	);
	assert.equal(withSearch(url, "token=abc"), "/connect/acme?token=abc");
});

test("no search leaves the URL as it is", () => {
	assert.equal(withSearch("/projects"), "/projects");
	assert.equal(withSearch("/projects", ""), "/projects");
	assert.equal(withSearch("/projects", "?"), "/projects");
});

test("defineFixtures takes the search after the channels, empty by default", () => {
	assert.equal(defineFixtures({}).search, "");
	assert.equal(defineFixtures({}, {}, {}, "?token=abc").search, "?token=abc");
});
