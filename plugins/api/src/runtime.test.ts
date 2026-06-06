import type { RuntimePlugin } from "@fcalell/cli/runtime";
import { describe, expect, it } from "vitest";
import createWorker from "./worker/index";

describe("createWorker", () => {
	it(".handler() returns a WorkerExport with fetch", () => {
		const builder = createWorker();
		const worker = builder.handler({});
		expect(typeof worker.fetch).toBe("function");
		expect(worker._router).toBeDefined();
	});

	it("context key collision throws for duplicate plugin names", () => {
		const pluginA: RuntimePlugin<"dup", object, { a: number }> = {
			name: "dup",
			context() {
				return { a: 1 };
			},
		};
		const pluginB: RuntimePlugin<"dup", object, { b: number }> = {
			name: "dup",
			context() {
				return { b: 2 };
			},
		};
		const builder = createWorker();
		expect(() => builder.use(pluginA).use(pluginB)).toThrow(
			'Context key collision: plugin "dup" already registered',
		);
	});

	it("allows multiple distinct plugins", () => {
		const pluginA: RuntimePlugin<"alpha", object, { a: number }> = {
			name: "alpha",
			context() {
				return { a: 1 };
			},
		};
		const pluginB: RuntimePlugin<"beta", object, { b: number }> = {
			name: "beta",
			context() {
				return { b: 2 };
			},
		};
		const builder = createWorker();
		const next = builder.use(pluginA).use(pluginB);
		const worker = next.handler({});
		expect(typeof worker.fetch).toBe("function");
	});

	// Empty cors[] is a misconfiguration: the consumer (or some upstream
	// derivation) opted into CORS but resolved to no origins. Silently
	// skipping the middleware would leak browser-fail-with-no-diagnostic
	// behavior — fail loud at construction time.
	it("throws at construction when cors is an empty array", () => {
		const builder = createWorker({ cors: [] });
		expect(() => builder.handler({})).toThrow(/cors was provided but is empty/);
	});

	it("allows cors: undefined for non-browser workers", () => {
		const builder = createWorker({ cors: undefined });
		const worker = builder.handler({});
		expect(typeof worker.fetch).toBe("function");
	});

	// Empty router is supported at construction; RPC requests then 404 through
	// Hono's onError. The point of locking this in: `aggregateWorker` emits
	// `.handler()` with no args when no routes exist, and that path must not
	// crash at builder time.
	it("does not throw when handler() is called with no consumer routes", () => {
		const builder = createWorker();
		expect(() => builder.handler({})).not.toThrow();
	});
});
