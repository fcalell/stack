import assert from "node:assert/strict";
import { test } from "node:test";
import { isCurrent } from "../src/ui/lib/navigate.ts";

test("a place is current at its route and below it, the root only at itself", () => {
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
});
