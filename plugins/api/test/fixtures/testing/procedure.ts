// The `virtual:stack-procedure` target the fixture routes import.
import { createProcedure } from "../../../src/procedure.ts";
import type createWorker from "../../../src/worker/index.ts";
import type { AppBuilder } from "../../../src/worker/index.ts";

// The env a Cloudflare consumer's `wrangler types` would declare:
// `FIXTURE_EXTRA` is optional because only a testing plugin adds it.
export interface FixtureEnv {
	STACK_DEV: string;
	FIXTURE_SECRET: string;
	FIXTURE_EXTRA?: string;
}

// Derived from a typed builder, as the generated `.stack/procedure.ts` does.
type ContextOf<B> = B extends AppBuilder<infer C> ? C : never;
type FixtureContext = ContextOf<ReturnType<typeof createWorker<FixtureEnv>>>;

export const procedure = createProcedure<FixtureContext>();
