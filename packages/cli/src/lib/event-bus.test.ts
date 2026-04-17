import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEventBus, defineEvent, type EventBus } from "#lib/event-bus";

describe("defineEvent", () => {
	it("creates an event with unique symbol id", () => {
		const e = defineEvent<void>("test", "foo");
		expect(e.source).toBe("test");
		expect(e.name).toBe("foo");
		expect(typeof e.id).toBe("symbol");
	});

	it("creates distinct symbols for different events", () => {
		const a = defineEvent<void>("test", "a");
		const b = defineEvent<void>("test", "b");
		expect(a.id).not.toBe(b.id);
	});

	it("creates distinct symbols even with same source and name", () => {
		const a = defineEvent<void>("test", "x");
		const b = defineEvent<void>("test", "x");
		expect(a.id).not.toBe(b.id);
	});
});

describe("EventBus", () => {
	let bus: EventBus;

	beforeEach(() => {
		bus = createEventBus();
	});

	describe("emit", () => {
		it("returns the payload", async () => {
			const event = defineEvent<{ value: number }>("test", "e");
			const result = await bus.emit(event, { value: 42 });
			expect(result).toEqual({ value: 42 });
		});

		it("returns the mutated payload after handlers run", async () => {
			const event = defineEvent<{ items: string[] }>("test", "e");
			bus.on(event, (data) => {
				data.items.push("a");
			});
			bus.on(event, (data) => {
				data.items.push("b");
			});
			const result = await bus.emit(event, { items: [] });
			expect(result.items).toEqual(["a", "b"]);
		});

		it("runs handlers sequentially in registration order", async () => {
			const event = defineEvent<{ order: number[] }>("test", "e");
			const order: number[] = [];

			bus.on(event, async () => {
				await new Promise((r) => setTimeout(r, 10));
				order.push(1);
			});
			bus.on(event, () => {
				order.push(2);
			});

			await bus.emit(event, { order: [] });
			expect(order).toEqual([1, 2]);
		});

		it("stores payload in history", async () => {
			const event = defineEvent<number>("test", "e");
			await bus.emit(event, 1);
			await bus.emit(event, 2);
			expect(bus.history(event)).toEqual([1, 2]);
		});

		it("rejects on first handler throw (fail-fast)", async () => {
			const event = defineEvent<void>("test", "e");
			const second = vi.fn();

			bus.on(event, () => {
				throw new Error("boom");
			});
			bus.on(event, second);

			await expect(bus.emit(event, undefined)).rejects.toThrow("boom");
			expect(second).not.toHaveBeenCalled();
		});

		it("stores payload in history even if handler throws", async () => {
			const event = defineEvent<string>("test", "e");
			bus.on(event, () => {
				throw new Error("boom");
			});

			await bus.emit(event, "before-throw").catch(() => {});
			expect(bus.history(event)).toEqual(["before-throw"]);
		});

		it("handles emit with no handlers registered", async () => {
			const event = defineEvent<string>("test", "e");
			const result = await bus.emit(event, "hello");
			expect(result).toBe("hello");
		});
	});

	describe("on", () => {
		it("returns an unsubscribe function", async () => {
			const event = defineEvent<void>("test", "e");
			const handler = vi.fn();

			const unsub = bus.on(event, handler);
			await bus.emit(event, undefined);
			expect(handler).toHaveBeenCalledTimes(1);

			unsub();
			await bus.emit(event, undefined);
			expect(handler).toHaveBeenCalledTimes(1);
		});

		it("does not affect other handlers when unsubscribing", async () => {
			const event = defineEvent<void>("test", "e");
			const a = vi.fn();
			const b = vi.fn();

			const unsub = bus.on(event, a);
			bus.on(event, b);

			unsub();
			await bus.emit(event, undefined);
			expect(a).not.toHaveBeenCalled();
			expect(b).toHaveBeenCalledTimes(1);
		});

		it("handles double unsubscribe gracefully", () => {
			const event = defineEvent<void>("test", "e");
			const unsub = bus.on(event, vi.fn());
			unsub();
			expect(() => unsub()).not.toThrow();
		});
	});

	describe("once", () => {
		it("resolves immediately if event was already emitted", async () => {
			const event = defineEvent<number>("test", "e");
			await bus.emit(event, 42);
			const result = await bus.once(event);
			expect(result).toBe(42);
		});

		it("resolves with the most recent emission from history", async () => {
			const event = defineEvent<number>("test", "e");
			await bus.emit(event, 1);
			await bus.emit(event, 2);
			const result = await bus.once(event);
			expect(result).toBe(2);
		});

		it("waits for next emission if no history", async () => {
			const event = defineEvent<string>("test", "e");

			const promise = bus.once(event);

			// Should not resolve yet
			let resolved = false;
			promise.then(() => {
				resolved = true;
			});
			await new Promise((r) => setTimeout(r, 5));
			expect(resolved).toBe(false);

			await bus.emit(event, "hello");
			const result = await promise;
			expect(result).toBe("hello");
		});

		it("auto-unsubscribes after resolving", async () => {
			const event = defineEvent<number>("test", "e");
			const promise = bus.once(event);

			await bus.emit(event, 1);
			await promise;

			// Emitting again should not cause issues
			await bus.emit(event, 2);
			// history should have both
			expect(bus.history(event)).toEqual([1, 2]);
		});
	});

	describe("history", () => {
		it("returns empty array for unknown events", () => {
			const event = defineEvent<void>("test", "e");
			expect(bus.history(event)).toEqual([]);
		});

		it("returns a copy (not the internal array)", async () => {
			const event = defineEvent<number>("test", "e");
			await bus.emit(event, 1);

			const hist = bus.history(event);
			hist.push(999);
			expect(bus.history(event)).toEqual([1]);
		});
	});

	describe("cross-event isolation", () => {
		it("handlers for one event do not fire for another", async () => {
			const a = defineEvent<void>("test", "a");
			const b = defineEvent<void>("test", "b");
			const handler = vi.fn();

			bus.on(a, handler);
			await bus.emit(b, undefined);
			expect(handler).not.toHaveBeenCalled();
		});

		it("history is isolated per event", async () => {
			const a = defineEvent<string>("test", "a");
			const b = defineEvent<string>("test", "b");

			await bus.emit(a, "alpha");
			await bus.emit(b, "beta");

			expect(bus.history(a)).toEqual(["alpha"]);
			expect(bus.history(b)).toEqual(["beta"]);
		});
	});
});
