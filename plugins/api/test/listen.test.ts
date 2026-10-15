import assert from "node:assert/strict";
import { test } from "node:test";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { listenQueries } from "../src/settle-reads.ts";

test("listen hands the managers their setters, and takes them back on cleanup", () => {
	const log: string[] = [];
	const stop = listenQueries({
		online: (set) => {
			log.push("online up");
			set(false);
			return () => log.push("online down");
		},
		focus: (set) => {
			log.push("focus up");
			set(false);
			return () => log.push("focus down");
		},
	});
	assert.deepEqual(log, ["online up", "focus up"]);
	assert.equal(onlineManager.isOnline(), false);
	assert.equal(focusManager.isFocused(), false);

	stop();
	assert.deepEqual(log, ["online up", "focus up", "online down", "focus down"]);
	// The defaults are back: node has no window, so nothing listens, and the
	// last state stands until someone sets it.
	onlineManager.setOnline(true);
	focusManager.setFocused(undefined);
	assert.equal(onlineManager.isOnline(), true);
	assert.equal(focusManager.isFocused(), true);
});

test("a listener left out leaves its manager alone", () => {
	const log: string[] = [];
	const stop = listenQueries({
		online: () => {
			log.push("online up");
			return () => log.push("online down");
		},
	});
	stop();
	assert.deepEqual(log, ["online up", "online down"]);
});

test("the restored defaults listen on the window", () => {
	const events: Record<string, () => void> = {};
	const target = {
		addEventListener: (type: string, fn: () => void) => {
			events[type] = fn;
		},
		removeEventListener: (type: string) => {
			delete events[type];
		},
	};
	const stop = listenQueries({ online: () => () => {}, focus: () => () => {} });
	Object.assign(globalThis, { window: target });
	try {
		stop();
		assert.deepEqual(Object.keys(events).sort(), [
			"offline",
			"online",
			"visibilitychange",
		]);
		events["offline"]?.();
		assert.equal(onlineManager.isOnline(), false);
		events["online"]?.();
		assert.equal(onlineManager.isOnline(), true);
	} finally {
		onlineManager.setEventListener(() => () => {});
		focusManager.setEventListener(() => () => {});
		Reflect.deleteProperty(globalThis, "window");
	}
});
