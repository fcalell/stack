import assert from "node:assert/strict";
import { test } from "node:test";
import {
	bindRouter,
	follow,
	type InPlaceRouter,
	isCurrent,
	isRoute,
	navigate,
} from "../src/ui/lib/navigate.ts";

test("a route is rooted at the app, never a scheme, a protocol-relative URL or a bare hash", () => {
	assert.ok(isRoute("/"));
	assert.ok(isRoute("/deploys/d1?mode=dark#top"));
	assert.ok(!isRoute("//example.com"));
	assert.ok(!isRoute("https://example.com"));
	assert.ok(!isRoute("mailto:a@example.com"));
	assert.ok(!isRoute("#signup"));
});

interface Click {
	button?: number;
	metaKey?: boolean;
	ctrlKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
	defaultPrevented?: boolean;
}

// An anchor click as React hands it to `onClick`.
function click(href: string | null, init: Click = {}) {
	let prevented = false;
	const event = {
		button: 0,
		metaKey: false,
		ctrlKey: false,
		shiftKey: false,
		altKey: false,
		defaultPrevented: false,
		...init,
		currentTarget: { getAttribute: () => href },
		preventDefault: () => {
			prevented = true;
		},
	};
	return { event, prevented: () => prevented };
}

function pressed(href: string | null, init?: Click) {
	const { event, prevented } = click(href, init);
	// A hand-built click carries only what `follow` reads.
	follow(event as unknown as Parameters<typeof follow>[0]);
	return prevented();
}

// The browser's `location`, which node has none of.
const assigned: string[] = [];
Object.defineProperty(globalThis, "location", {
	value: {
		pathname: "/doc",
		search: "",
		hash: "",
		assign: (route: string) => assigned.push(route),
	},
});

test("unbound, a click is the browser's and an act loads the document", () => {
	assert.equal(pressed("/deploys"), false);
	navigate("/deploys");
	assert.deepEqual(assigned, ["/deploys"]);
});

test("bound, a route opens in the router and every other click is the browser's", () => {
	const opened: string[] = [];
	const heard: Array<() => void> = [];
	const router: InPlaceRouter = {
		navigate: ({ href }) => opened.push(href),
		subscribe: (_event, listener) => heard.push(listener),
		state: { location: { href: "/a" }, resolvedLocation: { href: "/b" } },
	};
	bindRouter(router);
	assert.equal(heard.length, 1);

	assert.equal(pressed("/deploys?mode=dark#top"), true);
	assert.deepEqual(opened, ["/deploys?mode=dark#top"]);

	assert.equal(pressed("/deploys", { button: 1 }), false);
	assert.equal(pressed("/deploys", { metaKey: true }), false);
	assert.equal(pressed("/deploys", { ctrlKey: true }), false);
	assert.equal(pressed("/deploys", { shiftKey: true }), false);
	assert.equal(pressed("/deploys", { altKey: true }), false);
	assert.equal(pressed("/deploys", { defaultPrevented: true }), false);
	assert.equal(pressed("https://example.com/x"), false);
	assert.equal(pressed("//example.com/x"), false);
	assert.equal(pressed("#signup"), false);
	assert.equal(pressed(null), false);
	assert.equal(opened.length, 1);

	navigate("/work");
	assert.deepEqual(opened, ["/deploys?mode=dark#top", "/work"]);
	navigate("https://example.com");
	assert.deepEqual(assigned.slice(-1), ["https://example.com"]);
});

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
