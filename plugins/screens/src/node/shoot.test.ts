import assert from "node:assert/strict";
import { test } from "node:test";
import {
	parseCookie,
	parseModes,
	parseWidthList,
	routeSlug,
	shotName,
} from "./shoot.ts";

test("a route's name in a file", () => {
	assert.equal(routeSlug("/"), "index");
	assert.equal(routeSlug("/deploys/abc?x=1"), "deploys-abc-x-1");
});

test("a shot is named by route, width and mode, with the open control", () => {
	assert.equal(shotName("home", 320, "dark"), "home-320-dark.png");
	assert.equal(
		shotName("home", 320, "dark", "Invite people"),
		"home-320-dark-open-invite-people.png",
	);
});

test("widths default to a phone and a monitor", () => {
	assert.deepEqual(parseWidthList(undefined, [320, 1920]), [320, 1920]);
	assert.deepEqual(parseWidthList("375, 1280", [1]), [375, 1280]);
	assert.throws(() => parseWidthList("wide", [1]), /not a width/);
});

test("the mode defaults to dark", () => {
	assert.deepEqual(parseModes(undefined), ["dark"]);
	assert.deepEqual(parseModes("light,dark"), ["light", "dark"]);
	assert.throws(() => parseModes("sepia"), /not light or dark/);
});

test("a cookie is name=value, the value may hold =", () => {
	assert.deepEqual(parseCookie("sid=a=b"), { name: "sid", value: "a=b" });
	assert.equal(parseCookie(undefined), undefined);
	assert.throws(() => parseCookie("sid"), /name=value/);
});
