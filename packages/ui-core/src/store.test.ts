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
