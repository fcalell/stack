import assert from "node:assert/strict";
import { test } from "node:test";
import { createStore } from "./store.ts";

test("a set replaces the value and tells every subscriber", () => {
	const store = createStore(1);
	let first = 0;
	let second = 0;
	store.subscribe(() => first++);
	store.subscribe(() => second++);
	store.set(2);
	assert.equal(store.get(), 2);
	assert.deepEqual([first, second], [1, 1]);
});

test("an emit tells the subscribers of a change in place", () => {
	const held = new Map<string, number>();
	const store = createStore(held);
	let told = 0;
	store.subscribe(() => told++);
	held.set("a", 1);
	store.emit();
	assert.equal(told, 1);
	assert.equal(store.get().get("a"), 1);
});

test("the function subscribe returns stops the listener", () => {
	const store = createStore(0);
	let told = 0;
	const stop = store.subscribe(() => told++);
	assert.equal(stop(), undefined);
	store.set(1);
	assert.equal(told, 0);
});

test("size counts the listeners", () => {
	const store = createStore(0);
	assert.equal(store.size, 0);
	const stop = store.subscribe(() => {});
	store.subscribe(() => {});
	assert.equal(store.size, 2);
	stop();
	assert.equal(store.size, 1);
});

test("a source starts with the first listener and stops with the last", () => {
	const log: string[] = [];
	const store = createStore(0, {
		source: (held) => {
			log.push(`start ${held.size}`);
			return () => log.push("stop");
		},
	});
	const one = store.subscribe(() => {});
	const two = store.subscribe(() => {});
	assert.deepEqual(log, ["start 1"]);
	one();
	assert.deepEqual(log, ["start 1"]);
	two();
	assert.deepEqual(log, ["start 1", "stop"]);
	store.subscribe(() => {});
	assert.deepEqual(log, ["start 1", "stop", "start 1"]);
});

test("a source feeds the value through the store", () => {
	let feed = () => {};
	const store = createStore(0, {
		source: (held) => {
			feed = () => held.set(held.get() + 1);
			return () => {};
		},
	});
	let told = 0;
	store.subscribe(() => told++);
	feed();
	assert.deepEqual([store.get(), told], [1, 1]);
});

test("a listener's stop twice, or a repeated subscribe, runs the source once", () => {
	let started = 0;
	let stopped = 0;
	const store = createStore(0, {
		source: () => {
			started++;
			return () => stopped++;
		},
	});
	const listener = () => {};
	const stop = store.subscribe(listener);
	store.subscribe(listener);
	stop();
	stop();
	assert.deepEqual([started, stopped], [1, 1]);
});
