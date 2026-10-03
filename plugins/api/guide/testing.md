# Testing procedures

`stack generate` writes `.stack/testing.ts` beside the worker: a test entry that loads the worker
under plain node with the dev env (`STACK_DEV=1` plus every declared env var's `devDefault`) and
whatever each plugin's testing setup adds. A test
boots it and calls procedures through a typed client bound to `worker.fetch`, with no server and
no port.

```ts
// src/worker/routes/projects.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { ORPCError } from "@fcalell/plugin-api/testing";
import { testing } from "../../../.stack/testing.ts";

test("a stranger cannot list projects", async () => {
  await using app = await testing.boot();
  await assert.rejects(
    app.client().projects.list({ organizationId: "org_1" }),
    (error) => error instanceof ORPCError && error.code === "UNAUTHORIZED",
  );
});
```

Run it with `node --test 'src/**/*.test.ts'`. A test file beside a route is never part of the
router: the barrel skips `*.test.ts`.

## The handle

`boot()` returns `env` (the live env object every request reads), `worker`, `fetch` (a relative
URL resolves against `http://stack.test`), `client({ cookie })`, `dispose()` and
`Symbol.asyncDispose`, plus what each testing setup provides. `app.client({ cookie })` answers as
that session.

- `boot({ env })` overrides baked values for one boot. Each boot loads a fresh worker, so its env
  checks run against that boot's env.
- Each boot sets `STACK_QUIET=1`: the worker writes no request log and no env-check line, and
  errors still log. `boot({ env: { STACK_QUIET: "" } })` turns the logs back on.
- One process serves one `.stack/procedure.ts`; `node --test` runs each file in its own process.

**Check:** `node --test` passes on the new test.
