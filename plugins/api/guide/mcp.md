# Serving MCP

A worker serves MCP clients at `POST /mcp` when `src/worker/mcp.ts` exists. Its default export
lists the procedures an agent may call; every other procedure is unknown to it. It needs
`auth({ mcp: true })` (auth's `mcp-oauth` page): the access token that
provider issues is the only credential `/mcp` accepts.

```ts
// src/worker/mcp.ts
import { defineMcp } from "@fcalell/plugin-api/mcp";
import type * as routes from "./routes/index.ts";

export default defineMcp<typeof routes>({
  instructions: "Plan and describe a tracking setup.",
  tools: {
    "projects.list": "Lists the projects of the organization.",
    "pages.describe": "Edits a page's description.",
  },
});
```

A tool is a procedure under its dotted router path as its name, and its description is the
string. The keys are typed as the router's procedure paths, so a namespace or a missing path
fails type-checking. `tools/list` answers in the file's order.

## What generate checks

`stack generate` refuses the file without `auth({ mcp: true })`, without a routable file in
`src/worker/routes`, and when `api({ prefix })` is `/mcp`. Otherwise the worker mounts the
endpoint, `/mcp` joins `api.slots.routePrefixes`, and `mcp` is a reserved organization slug.
Building the worker refuses, naming the tool, a path that names no procedure, a name outside
letters, digits, `_`, `-` and `.` or over 128 characters, an input that is not an object schema
or holds a type JSON Schema cannot (a `bigint`), and a `z.date()` inside a record, tuple,
intersection or lazy schema.

## A call

Each request, in order: a browser `Origin` off the allow-list is `403`; the bearer token is
verified (`401`, `403` and `429` answer with the challenge unchanged, and a refused token draws
the per-IP budget); the body is read, at most 4 MiB (`413`), and a JSON error or a batch is `400`.
The procedure then runs in process as the grant's member in the grant's organization, every
middleware included. A cookie authenticates nothing here, and the procedure's `reqHeaders` hold
no `cookie` or `authorization`.

- **Input.** The tool's input schema is the procedure's whole input as JSON Schema (scope ids and
  pagination included); a `z.date()` is a `date-time` string and arrives as a `Date`.
- **Result.** A plain object is `structuredContent`; any other value is `{ result: value }`. The
  text content is the same JSON.
- **Refusals.** An `ApiError` is an `isError` result carrying `{ code, message, data }`; any other
  throw is `isError` with `INTERNAL_SERVER_ERROR` and no message, and is logged. An unlisted
  name is the protocol's invalid-params error.
- **Read-only.** A procedure written with `.query()` carries `readOnlyHint`; `.mutation()` and
  `.handler()` carry none.
- **Eras.** Clients of protocol 2026-07-28 and of the 2025 era are both served, statelessly:
  nothing is held between requests, GET and DELETE are `405`, and `subscriptions/listen` is
  refused.
- **Instructions.** The worker appends the grant's organization id, which is the only place an
  agent learns it.

## Rules

- A tool that must differ from its procedure is a new procedure; the file only lists.
- A procedure that forwards `reqHeaders` to the auth service finds no session: an agent has no
  cookie.
- The context key `_caller` is the endpoint's, and `oauth` is the provider's; neither is a scope
  name.

Test a tool with `app.mcp({ token, era })` ([testing](./testing.md)).

**Check:** `stack generate`, then a test lists the tools and calls one.
