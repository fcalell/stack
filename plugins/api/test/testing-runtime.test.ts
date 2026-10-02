import assert from "node:assert/strict";
import { test } from "node:test";
import {
	createTestEntry,
	ORPCError,
	type TestingPlugin,
} from "../src/testing/index.ts";
import type { AppRouter } from "./fixtures/testing/worker.ts";

const fixture = new URL("./fixtures/testing/", import.meta.url);
const SECRET = "fixture-secret-0123456789";

function entry() {
	return createTestEntry<AppRouter>({
		worker: new URL("worker.ts", fixture),
		procedure: new URL("procedure.ts", fixture),
		root: fixture,
		prefix: "/rpc",
		env: { STACK_DEV: "1", FIXTURE_SECRET: SECRET },
	});
}

// Compile-time equality, so a widened or narrowed handle type fails
// `check-types`.
type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;
function assertType<T extends true>(_: T): void {}

test("a route importing virtual:stack-procedure answers under node", async () => {
	await using app = await entry().boot();
	assert.equal(await app.client().hello.secret(), SECRET);
});

test("a cookie reaches the worker and a refusal arrives by code", async () => {
	await using app = await entry().boot();
	await assert.rejects(app.client().hello.cookie(), (error: unknown) => {
		assert.ok(error instanceof ORPCError);
		assert.equal(error.code, "FORBIDDEN");
		return true;
	});
	assert.equal(
		await app.client({ cookie: "session=abc" }).hello.cookie(),
		"session=abc",
	);
});

test("boot env overrides the baked env and is checked per boot", async () => {
	const testing = entry();
	const other = "another-secret-0123456789";
	{
		await using app = await testing.boot({ env: { FIXTURE_SECRET: other } });
		assert.equal(await app.client().hello.secret(), other);
	}
	{
		await using app = await testing.boot();
		assert.equal(await app.client().hello.secret(), SECRET);
	}
	{
		await using app = await testing.boot({ env: { FIXTURE_SECRET: "short" } });
		await assert.rejects(
			app.client().hello.secret(),
			(error: unknown) =>
				error instanceof ORPCError && error.code === "INTERNAL_SERVER_ERROR",
		);
	}
});

interface A {
	a: string;
}
interface B {
	b: number;
}

test("testing plugins run in dependency order and dispose in reverse", async () => {
	const order: string[] = [];
	const provider: TestingPlugin<"a", object, { a: A }> = {
		name: "a",
		async setup() {
			order.push("setup a");
			return {
				env: { FIXTURE_EXTRA: "from-a" },
				provides: { a: { a: "provided" } },
				async dispose() {
					order.push("dispose a");
				},
			};
		},
	};
	let seen: A | undefined;
	const dependent: TestingPlugin<"b", { a: A }, { b: B }> = {
		name: "b",
		dependsOn: ["a"],
		async setup(_ctx, upstream) {
			order.push("setup b");
			seen = upstream.a;
			return {
				provides: { b: { b: 1 } },
				async dispose() {
					order.push("dispose b");
				},
			};
		},
	};

	const app = await entry().use(dependent).use(provider).boot();
	assertType<Equal<typeof app.a, A>>(true);
	assertType<Equal<typeof app.b, B>>(true);
	assert.deepEqual(seen, { a: "provided" });
	assert.deepEqual(app.a, { a: "provided" });
	assert.deepEqual(app.b, { b: 1 });
	assert.equal(await app.client().hello.extra(), "from-a");
	await app.dispose();
	assert.deepEqual(order, ["setup a", "setup b", "dispose b", "dispose a"]);
});

test("a failed boot names its cause and disposes what it set up", async () => {
	const cyclic = (name: string, dep: string): TestingPlugin<string> => ({
		name,
		dependsOn: [dep],
		async setup() {
			return {};
		},
	});
	await assert.rejects(
		entry().use(cyclic("left", "right")).use(cyclic("right", "left")).boot(),
		/left -> right -> left/,
	);

	const disposed: string[] = [];
	const disposing = (name: string): TestingPlugin<string> => ({
		name,
		async setup() {
			return {
				async dispose() {
					disposed.push(name);
				},
			};
		},
	});
	const failure = new Error("setup failed");
	const failing: TestingPlugin<"failing"> = {
		name: "failing",
		dependsOn: ["first", "second"],
		async setup() {
			throw failure;
		},
	};
	await assert.rejects(
		entry()
			.use(disposing("first"))
			.use(disposing("second"))
			.use(failing)
			.boot(),
		(error: unknown) => error === failure,
	);
	assert.deepEqual(disposed, ["second", "first"]);

	await (await entry().boot()).dispose();
	const elsewhere = new URL("elsewhere/procedure.ts", fixture);
	await assert.rejects(
		createTestEntry<AppRouter>({
			worker: new URL("worker.ts", fixture),
			procedure: elsewhere,
			root: fixture,
			prefix: "/rpc",
			env: { STACK_DEV: "1", FIXTURE_SECRET: SECRET },
		}).boot(),
		(error: unknown) =>
			error instanceof Error &&
			error.message.includes(new URL("procedure.ts", fixture).href) &&
			error.message.includes(elsewhere.href),
	);
});
