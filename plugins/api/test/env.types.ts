import createWorker, {
	type AppBuilder,
	type BaseContext,
} from "../src/worker/index.ts";
import { type FixtureEnv, procedure } from "./fixtures/testing/procedure.ts";
import { assertType, type Equal } from "./types.ts";

// `tsc` runs over this file in `pnpm check`: an env type that widens, narrows
// or stops reaching the handler fails the check.

type ContextOf<B> = B extends AppBuilder<infer C> ? C : never;

// A handler reads a declared env var typed: the fixture's `hello.secret` is
// this read, with no cast.
procedure().query(async ({ context }) => {
	const secret = context.env.FIXTURE_SECRET;
	assertType<Equal<typeof secret, string>>(true);
	const extra = context.env.FIXTURE_EXTRA;
	assertType<Equal<typeof extra, string | undefined>>(true);
	return secret;
});

// An undeclared env var is a type error.
procedure().query(async ({ context }) => {
	// @ts-expect-error FixtureEnv declares no such var
	return context.env.FIXTURE_UNDECLARED;
});

// The builder carries the env type through use.
const base = createWorker<FixtureEnv>();
// `use` accepts a function over exactly the base context.
const inject = (ctx: ContextOf<typeof base>) => {
	assertType<Equal<typeof ctx.env, FixtureEnv>>(true);
	return { extra: 1 };
};
const builder = base.use(inject);
assertType<Equal<ContextOf<typeof builder>["env"], FixtureEnv>>(true);
assertType<Equal<ContextOf<typeof builder>["extra"], number>>(true);

// Without a type argument env stays unknown.
assertType<Equal<BaseContext["env"], unknown>>(true);
assertType<Equal<ContextOf<ReturnType<typeof createWorker>>["env"], unknown>>(
	true,
);
