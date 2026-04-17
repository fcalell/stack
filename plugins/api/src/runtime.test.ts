import { describe, expect, it } from "vitest";
import { createWorker, type RuntimePlugin } from "./worker/index";

describe("createWorker", () => {
	it("returns an AppBuilder with use and handler methods", () => {
		const builder = createWorker();
		expect(typeof builder.use).toBe("function");
		expect(typeof builder.handler).toBe("function");
	});

	it("accepts plain options", () => {
		const builder = createWorker({ prefix: "/api", cors: "https://a.com" });
		expect(typeof builder.use).toBe("function");
		expect(typeof builder.handler).toBe("function");
	});

	it(".use() with a RuntimePlugin returns a new AppBuilder", () => {
		const plugin: RuntimePlugin<"test", object, { testValue: string }> = {
			name: "test",
			context() {
				return { testValue: "hello" };
			},
		};
		const builder = createWorker();
		const next = builder.use(plugin);
		expect(typeof next.use).toBe("function");
		expect(typeof next.handler).toBe("function");
	});

	it(".use() with a function returns a new AppBuilder", () => {
		const builder = createWorker();
		const next = builder.use(() => ({ extra: true }));
		expect(typeof next.use).toBe("function");
		expect(typeof next.handler).toBe("function");
	});

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

	it("defaults prefix to /rpc when no options given", () => {
		const builder = createWorker();
		const worker = builder.handler({});
		expect(worker._router).toBeDefined();
	});
});
