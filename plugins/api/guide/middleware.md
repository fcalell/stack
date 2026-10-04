# Worker middleware

Two optional files hold plain Hono middleware, and the worker mounts both on its own:

| File | Runs | Sees |
| --- | --- | --- |
| `src/worker/middleware.ts` | after CORS and logging, before the plugin context is built | the request only |
| `src/worker/middleware.context.ts` | after the context is built, before any route | `stackContext(c)` |

Put a guard that needs no database in the first, so it rejects before the worker pays for a db
client. Put anything that needs `db` or `auth` in the second, including a raw Hono route outside
the RPC tree (a multipart upload, a webhook), which then reaches the same clients the procedures
use. Type the context with the generated `WorkerContext`, imported type-only.

```ts
// src/worker/middleware.context.ts
import type { WorkerContext } from "virtual:stack-procedure";
import { isForbiddenOrigin, stackContext } from "@fcalell/plugin-api/runtime";
import { createMiddleware } from "hono/factory";

export default createMiddleware(async (c, next) => {
  if (c.req.path === "/photos" && c.req.method === "POST") {
    if (isForbiddenOrigin(c)) return c.json({ code: "FORBIDDEN" }, 403);
    const { db } = stackContext<WorkerContext>(c);
    // store the upload with db
  }
  await next();
});
```

## Rules

- Every raw route that changes state calls `isForbiddenOrigin(c)` first. The RPC tree gets its
  CSRF guard from its JSON content type; a multipart upload does not. It refuses a request whose
  browser `Origin` is off the CORS allow-list and passes one with no `Origin` (a browser cannot
  forge that cross-site, and the native client sends none).

## Renamed cache headers

A procedure's response carries `x-stack-reads` and `x-stack-writes` (`STACK_READS_HEADER`,
`STACK_WRITES_HEADER` from `@fcalell/plugin-api/procedure`). A worker replacing hand-rolled code
whose deployed clients parse other names mirrors them in `src/worker/middleware.ts` until those
builds are gone:

```ts
// src/worker/middleware.ts
import { STACK_READS_HEADER, STACK_WRITES_HEADER } from "@fcalell/plugin-api/procedure";
import { createMiddleware } from "hono/factory";

const LEGACY: Record<string, string> = {
  [STACK_READS_HEADER]: "x-sw-reads",
  [STACK_WRITES_HEADER]: "x-sw-writes",
};

export default createMiddleware(async (c, next) => {
  await next();
  for (const [current, legacy] of Object.entries(LEGACY)) {
    const value = c.res.headers.get(current);
    if (value) c.header(legacy, value);
  }
});
```

Request headers have no such mirror: expo's version gate reads only `x-stack-client-build` and
`x-stack-client-platform`, so a build stamping other names is never walled. Ship a release that
stamps the current names before raising a floor.

**Check:** `pnpm check` passes, and the route answers under `pnpm dev`.
