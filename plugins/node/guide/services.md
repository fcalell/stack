# Services

A service is code that runs for the life of the Node server: a watcher, a queue consumer, a
WebSocket channel, an HTTP surface outside the API. Each is a file in `src/server/services/`
default-exporting `defineService` from `@fcalell/plugin-node/server`. The generated
`src/server/services/index.ts` lists them; never edit it.

```ts
// src/server/services/board-watcher.ts
import { defineService } from "@fcalell/plugin-node/server";
import { board } from "../../shared/channels.ts";

export default defineService({
  name: "board-watcher",
  start({ log, ws, http }) {
    const channel = ws.channel(board, {
      onSubscribe(conn) {
        conn.send("snapshot", { cards: [] });
      },
    });
    const timer = setInterval(() => channel.broadcast("tick", { at: Date.now() }), 5000);
    log.info("watching");
    return () => clearInterval(timer);
  },
});
```

`start` runs before the server listens, one service after another in file-name order. It may
return a stop function, which runs on shutdown in reverse order. A `start` that throws stops the
process.

## Order: `start` then `ready`

File-name order is the only order, so a `start` must not rely on another service having started:
`inbox.ts` starts before `jobs.ts`, and a `start` that enqueues a job would run before the runner
that takes it exists. Work that needs the other services goes in `ready`: it runs for every
service, in the same file-name order, once every `start` has resolved, and still before the server
listens.

```ts
export default defineService({
  name: "inbox",
  start({ log }) {
    // Own state only: open the watcher, load what this service keeps.
  },
  async ready() {
    // Every service has started: enqueue, read what another service loaded, broadcast.
    await enqueue("inbox", { reason: "boot" });
  },
});
```

`ready` takes the same context as `start` and may return a stop function too. Stops run in reverse
over `start`s and `ready`s together, so every `ready` stop runs before any `start` stop. A
`ready` that throws stops the process like a `start`. Keep `ready` short (it holds the listen):
enqueue the work and return. Two `ready`s still run in file-name order, so one `ready` must not
wait on another's.

## The context

| Field | Is |
| --- | --- |
| `log` | `info(message)` and `error(message)` |
| `ws` | The WebSocket hub: `ws.channel(def, handlers)` registers a channel and answers its `broadcast(type, payload)` |
| `http.mount(prefix, handler)` | Routes every request under `prefix` to a fetch-style `handler(request)`, ahead of the worker and the web client. The longest prefix wins |
| `http.session(request)` | The `{ user, session }` the request's `Cookie` or `Authorization: Bearer` holds, as `/ws` resolves it, or `null` (none, refused, or the app has no `auth()`) |
| `http.port` | The listen port |

## Channels

A channel is declared once with `defineChannel` from `@fcalell/plugin-node/ws`, in a module the
server and the app both import. Its zod schemas type every message both ways.

```ts
// src/shared/channels.ts
import { defineChannel } from "@fcalell/plugin-node/ws";
import { z } from "@fcalell/plugin-api/schema";

export const board = defineChannel("board", {
  server: { snapshot: z.object({ cards: z.array(z.string()) }), tick: z.object({ at: z.number() }) },
  client: {},
});
```

The hub takes `onSubscribe(conn)`, `onUnsubscribe(conn)` and `onMessage.<type>(payload, conn)`;
`conn.id` is stable for the socket's life. In the app, `createWsClient()` from
`@fcalell/plugin-node/client` opens one socket to `/ws` on its first subscribe, and
`client.subscribe(board, { onMessage: { tick(payload) {} }, onStatus(status) {} })` answers a
subscription with `send(type, payload)` and `unsubscribe()`. The client reconnects on its own and
subscribes again, so a channel that sends a snapshot in `onSubscribe` stays consistent.

## Who is connected

`/ws` is authenticated and origin-checked before the socket opens, because a browser applies no
CORS to a WebSocket. An upgrade whose `Origin` is not on the worker's CORS list (the production
origins, plus the dev origins under `pnpm dev`) is refused with 403, and so is one with no valid
session when the app has `auth()`. A request with no `Origin` (a native client, a headless daemon) is judged by its
session alone; the daemon sends its device key as `Authorization: Bearer`, which
`createWsClient({ url, headers })` sets on the upgrade (a browser ignores `headers`).

Every handler's `conn` carries the session the socket opened with, `conn.session`: `{ user, session }`
as `auth.api.getSession` answers, or `null` when the app has no auth. A channel decides what a
connection may see or do from it; a channel with no check sends to anyone signed in.

```ts
const channel = ws.channel(inbox, {
  onSubscribe(conn) {
    const userId = conn.session?.user.id;
    if (typeof userId !== "string") return;
    conn.send("snapshot", { items: itemsFor(userId) });
  },
});
```

`broadcast` reaches every subscribed connection, so a channel whose data is per user or per
organization sends it with `conn.send` to the connections that may read it. The session is read once,
at the upgrade: signing out or losing a membership does not close an open socket, so a handler that
must honour either re-checks on each message or closes the socket itself.

A mounted route authenticates the same way. Answer `401` on `null`; a route that changes state and
accepts a cookie also checks the request's `Origin` itself, as the worker's raw routes do.

```ts
http.mount("/sync", async (request) => {
  const session = await http.session(request);
  if (!session) return new Response("Unauthorized", { status: 401 });
  return handleSync(session.user.id, request);
});
```

## Modules a service finds in a directory

A service that runs what a directory holds (a job runner over `jobs/*.ts`) lists the directory with
`loadModules`, never `readdir`: the production bundle is one file with no directory to read, and
the build follows only this call. A thread the service starts is
`new Worker(new URL("./x.ts", import.meta.url))`, bundled the same way. The pages: `server.md`,
"Deploy a bundle".

```ts
import { loadModules } from "@fcalell/plugin-node/server";

const kinds = await loadModules(new URL("../jobs/", import.meta.url)); // { scan: { default }, ... }
```

## Rules

- One service per file, flat in `src/server/services/`: a subdirectory, `index.ts`, `*.test.ts`
  and `*.d.ts` are ignored.
- Code that needs a service imports its module; nothing is passed through a context.
- A mount prefix starts with `/`, is not `/`, and has no trailing `/`; never mount under a worker
  path (`/rpc`, `/api/auth`) or `/ws`.
- Release everything `start` and `ready` acquire in the stop function: a timer, a watcher, a connection.
- `start` touches only the service's own state; whatever needs another service (an enqueue, a read
  of what it loaded) is in `ready`.

**Check:** `stack generate`, then `pnpm check` passes, and `pnpm dev` logs
`service <name>: started` for each service, then `service <name>: ready` for each with a `ready`.
