import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createLeave } from "@fcalell/ui-core/leave";
import {
	bindRouter,
	blockLeave,
	follow,
	type InPlaceRouter,
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

// The window's listeners, which node has none of.
const listening = new Map<string, (event: unknown) => void>();
Object.assign(globalThis, {
	addEventListener: (type: string, listener: (event: unknown) => void) =>
		listening.set(type, listener),
	removeEventListener: (type: string) => listening.delete(type),
});

test("unbound, a form that asks holds the page's unload and nothing else", () => {
	const leave = createLeave();
	const release = blockLeave(leave, () => Promise.resolve(true));
	const unload = listening.get("beforeunload");
	assert.ok(unload);
	const held = () => {
		let prevented = false;
		unload({ preventDefault: () => (prevented = true) });
		return prevented;
	};
	assert.equal(held(), false);
	leave.edit();
	assert.equal(held(), true);
	leave.press();
	assert.equal(held(), false);
	release();
	assert.equal(listening.has("beforeunload"), false);
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
		preloadRoute: () => {},
		subscribe: (_event, listener) => heard.push(listener),
		state: { location: { href: "/a" }, resolvedLocation: { href: "/b" } },
		history: { block: () => () => {} },
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

test("bound, a form that asks holds the router's navigation until the question is answered", async () => {
	const blockers: Array<{
		blockerFn: () => Promise<boolean>;
		enableBeforeUnload: () => boolean;
	}> = [];
	let released = 0;
	bindRouter({
		navigate: () => {},
		preloadRoute: () => {},
		subscribe: () => {},
		state: { location: { href: "/a" } },
		history: {
			block: (blocker) => {
				blockers.push(blocker);
				return () => released++;
			},
		},
	});
	const leave = createLeave();
	let discard = false;
	let asked = 0;
	const release = blockLeave(leave, () => {
		asked++;
		return Promise.resolve(discard);
	});
	const [blocker] = blockers;
	assert.ok(blocker);
	// Nothing edited: the navigation goes ahead, unasked, and the unload is free.
	assert.equal(await blocker.blockerFn(), false);
	assert.equal(blocker.enableBeforeUnload(), false);
	assert.equal(asked, 0);

	leave.edit();
	assert.equal(blocker.enableBeforeUnload(), true);
	// Keep editing: the router holds the navigation.
	assert.equal(await blocker.blockerFn(), true);
	assert.equal(asked, 1);
	// Discard: it goes ahead, and nothing asks again.
	discard = true;
	assert.equal(await blocker.blockerFn(), false);
	assert.equal(await blocker.blockerFn(), false);
	assert.equal(asked, 2);
	release();
	assert.equal(released, 1);
});

// The document's delegated listeners, which node has none of; a target is
// the anchor itself, or nothing an anchor wraps.
const delegated = new Map<string, Array<(event: unknown) => void>>();
let added = 0;
Object.defineProperty(globalThis, "document", {
	value: {
		addEventListener: (type: string, listener: (event: unknown) => void) => {
			added++;
			delegated.set(type, [...(delegated.get(type) ?? []), listener]);
		},
	},
});

function over(type: "pointerover" | "focusin", href: string | null) {
	const target = {
		closest: () => (href === null ? null : { getAttribute: () => href }),
	};
	for (const listener of delegated.get(type) ?? []) listener({ target });
}

test("a rest of 50 ms on a route's anchor preloads it once, and a pass preloads nothing", () => {
	mock.timers.enable({ apis: ["setTimeout"] });
	const preloaded: string[] = [];
	const router: InPlaceRouter = {
		navigate: () => {},
		preloadRoute: ({ href }) => preloaded.push(href),
		subscribe: () => {},
		state: { location: { href: "/a" } },
		history: { block: () => () => {} },
	};
	bindRouter(router);
	// Binding again, as the workbench does per story, keeps the page's listener.
	bindRouter(router);
	assert.equal(added, 2);

	over("pointerover", "/deploys/d1");
	mock.timers.tick(49);
	assert.deepEqual(preloaded, []);
	mock.timers.tick(1);
	assert.deepEqual(preloaded, ["/deploys/d1"]);
	mock.timers.tick(500);
	assert.equal(preloaded.length, 1);

	// Leaving, or crossing to another anchor, drops the pending intent.
	over("pointerover", "/deploys/d2");
	mock.timers.tick(30);
	over("pointerover", null);
	mock.timers.tick(100);
	over("pointerover", "/deploys/d3");
	mock.timers.tick(30);
	over("pointerover", "/deploys/d4");
	mock.timers.tick(100);
	assert.deepEqual(preloaded, ["/deploys/d1", "/deploys/d4"]);

	// Focus is the keyboard's hover.
	over("focusin", "/work");
	mock.timers.tick(50);
	assert.deepEqual(preloaded.slice(-1), ["/work"]);

	// Somewhere else, a bare hash and the route already drawn have nothing to load.
	for (const href of [
		"https://example.com/x",
		"//example.com/x",
		"#top",
		"/a",
	]) {
		over("pointerover", href);
		mock.timers.tick(100);
	}
	assert.equal(preloaded.length, 3);
	mock.timers.reset();
});
