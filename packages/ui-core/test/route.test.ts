import assert from "node:assert/strict";
import { test } from "node:test";
import { isCurrent, placeAt } from "../src/route.ts";

test("a row is current at its route and below it, the root only at itself", () => {
	assert.ok(isCurrent("/deploys", "/deploys"));
	assert.ok(isCurrent("/deploys", "/deploys/d1"));
	assert.ok(!isCurrent("/deploys", "/deploys-old"));
	assert.ok(isCurrent("/", "/"));
	assert.ok(!isCurrent("/", "/deploys"));
});

test("a route's query narrows it to the routes carrying each of its parameters", () => {
	const deploys = "/layout?place=deploys&mode=dark";
	assert.ok(isCurrent(deploys, "/layout?place=deploys&mode=dark"));
	assert.ok(isCurrent(deploys, "/layout?mode=dark&place=deploys&record=d1"));
	assert.ok(!isCurrent(deploys, "/layout?place=usage&mode=dark"));
	assert.ok(!isCurrent(deploys, "/layout?place=deploys"));
	assert.ok(isCurrent("/deploys", "/deploys?record=d1"));
	assert.ok(isCurrent("/layout?name=a%20b", "/layout?name=a+b"));
});

test("a hash narrows a route to the location carrying it, and a bare hash names a spot on any page", () => {
	assert.ok(!isCurrent("#signup", "/"));
	assert.ok(!isCurrent("#signup", "/deploys"));
	assert.ok(isCurrent("#signup", "/#signup"));
	assert.ok(isCurrent("#signup", "/deploys#signup"));
	assert.ok(!isCurrent("#signup", "/deploys#login"));
	assert.ok(!isCurrent("/deploys#signup", "/deploys"));
	assert.ok(isCurrent("/deploys#signup", "/deploys#signup"));
	assert.ok(isCurrent("/deploys", "/deploys#signup"));
	assert.ok(isCurrent("/", "/#signup"));
});

const now = { route: "/" };
const chats = { route: "/chats" };
const work = { route: "/work" };
const code = { route: "/work/code" };

test("the root place owns every address no other place claims", () => {
	const places = [now, chats, work];
	assert.equal(placeAt(places, "/"), "/");
	assert.equal(placeAt(places, "/items/x"), "/");
	assert.equal(placeAt(places, "/items/x?mode=dark#top"), "/");
	assert.equal(placeAt(places, "/chats"), "/chats");
	assert.equal(placeAt(places, "/chats/c1"), "/chats");
	assert.equal(placeAt(places, "/chats-old"), "/");
});

test("with no root place an unclaimed address belongs to none", () => {
	assert.equal(placeAt([chats, work], "/items/x"), undefined);
	assert.equal(placeAt([], "/"), undefined);
});

test("nested places select the deeper one, in any order", () => {
	assert.equal(placeAt([now, work, code], "/work"), "/work");
	assert.equal(placeAt([now, work, code], "/work/code"), "/work/code");
	assert.equal(placeAt([now, work, code], "/work/code/f1"), "/work/code");
	assert.equal(placeAt([now, work, code], "/work/other"), "/work");
	assert.equal(placeAt([code, work, now], "/work/code/f1"), "/work/code");
});

test("places that differ by query select the one the address carries, the most parameters first", () => {
	const deploys = { route: "/layout?place=deploys" };
	const usage = { route: "/layout?place=usage" };
	const dark = { route: "/layout?place=deploys&mode=dark" };
	assert.equal(
		placeAt([now, deploys, usage], "/layout?place=usage"),
		"/layout?place=usage",
	);
	assert.equal(placeAt([now, deploys, usage], "/layout"), "/");
	assert.equal(
		placeAt([deploys, usage], "/layout?place=usage&record=u1"),
		"/layout?place=usage",
	);
	assert.equal(placeAt([deploys, usage], "/layout"), undefined);
	assert.equal(
		placeAt([deploys, dark], "/layout?place=deploys&mode=dark"),
		"/layout?place=deploys&mode=dark",
	);
	assert.equal(
		placeAt([deploys, dark], "/layout?place=deploys"),
		"/layout?place=deploys",
	);
});

test("the earlier place wins a tie", () => {
	assert.equal(placeAt([{ route: "/a" }, { route: "/a" }], "/a"), "/a");
	const first = { route: "/a?x=1" };
	const second = { route: "/a?y=2" };
	assert.equal(placeAt([first, second], "/a?x=1&y=2"), "/a?x=1");
});
