import assert from "node:assert/strict";
import { test } from "node:test";
import { defineFixtures, type RouteParams } from "./fixtures.ts";
import { paramsFor, routeUrl, withSearch } from "./route.ts";

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

const given = {
	destination: "a-1",
	"/_app/things/$thing/parts": { destination: "b-2" },
	"/_app/things": { thing: "t-1", destination: "c-3" },
} as const;

test("a plain param fills every route", () => {
	assert.equal(
		routeUrl("/_app/dest/$destination", "/dest/$destination", given),
		"/dest/a-1",
	);
});

test("a route's entry applies to it and the routes under it", () => {
	assert.equal(
		routeUrl("/_app/things/$thing", "/things/$thing/$destination", given),
		"/things/t-1/c-3",
	);
	assert.deepEqual(paramsFor("/_app/things/$thing/info", given), {
		destination: "c-3",
		thing: "t-1",
	});
});

test("the most specific entry wins, the others still fill what it leaves", () => {
	assert.equal(
		routeUrl(
			"/_app/things/$thing/parts",
			"/things/$thing/parts/$destination",
			given,
		),
		"/things/t-1/parts/b-2",
	);
});

test("an entry does not reach a sibling route that only shares a prefix", () => {
	assert.deepEqual(paramsFor("/_app/thingsX", given), { destination: "a-1" });
});

test("a missing value names the route and where it looked", () => {
	assert.throws(
		() =>
			routeUrl("/_app/things/$thing/parts", "/things/$thing/x/$other", given),
		/"other" of the route \/_app\/things\/\$thing\/parts \(searched the plain params, the entry \/_app\/things, the entry \/_app\/things\/\$thing\/parts\)/,
	);
});

// The typing of the example values, held by the type-check: a plain name is any
// registered route's param, a route-id entry takes only the names of that route
// and the routes under it, and with no router registered the keys are strings.
type Ids = "/things/$thing" | "/things/$thing/parts/$part" | "/other/$orphan";
test("the example values are typed from the route tree", () => {
	const typed: RouteParams<Ids> = {
		part: "p",
		"/things/$thing": { thing: "t", part: "p" },
		"/things/$thing/parts/$part": { part: "p" },
	};
	// @ts-expect-error a plain name no registered route has
	const unknown: RouteParams<Ids> = { nothing: "x" };
	const outside: RouteParams<Ids> = {
		// @ts-expect-error a route outside the entry's id
		"/things/$thing/parts/$part": { orphan: "x" },
	};
	const loose: RouteParams<string> = { anything: "x", "/any": { a: "b" } };
	assert.ok(typed && unknown && outside && loose);
});
