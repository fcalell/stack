import type { z } from "zod";
import { createTestEntry } from "../src/testing/index.ts";
import type { greetingInput } from "./fixtures/testing/routes/inputs.ts";
import type { AppRouter } from "./fixtures/testing/worker.ts";
import { assertType, type Equal, type Flat } from "./types.ts";

// `tsc` runs over this file in `pnpm check`: a client parameter that drifts
// from its schema's input fails the check. Never called.
function boot() {
	return createTestEntry<AppRouter>({
		worker: new URL("./fixtures/testing/worker.ts", import.meta.url),
		procedure: new URL("./fixtures/testing/procedure.ts", import.meta.url),
		root: new URL("./fixtures/testing/", import.meta.url),
		prefix: "/rpc",
		env: {},
	}).boot();
}
type Client = ReturnType<Awaited<ReturnType<typeof boot>>["client"]>;

// The client parameter type is the schema's input.
assertType<
	Equal<
		Flat<Parameters<Client["inputs"]["greet"]>[0]>,
		z.input<typeof greetingInput>
	>
>(true);
