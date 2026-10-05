import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "../src/index.ts";
import { createTestEntry } from "../src/testing/index.ts";
import createWorker, {
	type AppBuilder,
	type BaseContext,
} from "../src/worker/index.ts";
import { type FixtureEnv, procedure } from "./fixtures/testing/procedure.ts";
import type { AppRouter } from "./fixtures/testing/worker.ts";
import { assertType, type Equal } from "./types.ts";

type ContextOf<B> = B extends AppBuilder<infer C> ? C : never;

const fixture = new URL("./fixtures/testing/", import.meta.url);
const SECRET = "fixture-secret-0123456789";

test("a handler reads a declared env var typed", async () => {
	// The fixture's `hello.secret` is this read, with no cast.
	procedure().query(async ({ context }) => {
		const secret = context.env.FIXTURE_SECRET;
		assertType<Equal<typeof secret, string>>(true);
		const extra = context.env.FIXTURE_EXTRA;
		assertType<Equal<typeof extra, string | undefined>>(true);
		return secret;
	});

	await using app = await createTestEntry<AppRouter>({
		worker: new URL("worker.ts", fixture),
		procedure: new URL("procedure.ts", fixture),
		root: fixture,
		prefix: "/rpc",
		env: { STACK_DEV: "1", FIXTURE_SECRET: SECRET },
	}).boot();
	assert.equal(await app.client().hello.secret(), SECRET);
});

test("an undeclared env var is a type error", () => {
	procedure().query(async ({ context }) => {
		// @ts-expect-error FixtureEnv declares no such var
		return context.env.FIXTURE_UNDECLARED;
	});
});

test("the builder carries the env type through use", () => {
	const base = createWorker<FixtureEnv>();
	// `use` accepts a function over exactly the base context.
	const inject = (ctx: ContextOf<typeof base>) => {
		assertType<Equal<typeof ctx.env, FixtureEnv>>(true);
		return { extra: 1 };
	};
	const builder = base.use(inject);
	assertType<Equal<ContextOf<typeof builder>["env"], FixtureEnv>>(true);
	assertType<Equal<ContextOf<typeof builder>["extra"], number>>(true);
});

test("without a type argument env stays unknown", () => {
	assertType<Equal<BaseContext["env"], unknown>>(true);
	assertType<Equal<ContextOf<ReturnType<typeof createWorker>>["env"], unknown>>(
		true,
	);
});

test("api alone bakes createWorker with no type argument", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "stack-api-env-"));
	mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });
	writeFileSync(
		join(cwd, "src/worker/routes/hello.ts"),
		"export const hello = {};\n",
	);
	const { graph } = buildGraphFromDiscovered({
		discovered: [
			{
				name: "api",
				cli: api.cli,
				factory: api,
				options: api({}).options,
			} as unknown as DiscoveredPlugin,
		],
		app: { name: "env", domain: "example.com" },
		cwd,
	});
	assert.equal(await graph.resolve(api.slots.envType), null);
	const base = await graph.resolve(api.slots.workerBase);
	assert.equal(base.kind, "call");
	assert.equal("typeArgs" in base, false);
});
