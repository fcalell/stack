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

## The context

| Field | Is |
| --- | --- |
| `log` | `info(message)` and `error(message)` |
| `ws` | The WebSocket hub: `ws.channel(def, handlers)` registers a channel and answers its `broadcast(type, payload)`; `ws.closeSession(id)` closes a session's sockets |
| `http.mount(prefix, handler)` | Routes every request under `prefix` to a fetch-style `handler(request)`, ahead of the worker and the web client. The longest prefix wins |
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
CORS to a WebSocket. An upgrade with no `Origin`, or one off the worker's CORS list (the
production origins, plus the dev origins under `pnpm dev`; on a further listener, its own origin
alone), is refused with 403, and so is one with no valid session when the app has `auth()`. The
session is read from the database, past the cookie cache, so a revoked one opens nothing.

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
organization sends it with `conn.send` to the connections that may read it. The session is read
once, at the upgrade, and its sockets close when it ends: a sign-out or a revoke through auth
closes them by itself, and a session your code ends another way (its row deleted) closes them with
`ws.closeSession(sessionId)` on the hub `start` received. A lost membership closes nothing, so a
handler that must honour one re-checks on each message.

## Rules

- One service per file, flat in `src/server/services/`: a subdirectory, `index.ts`, `*.test.ts`
  and `*.d.ts` are ignored.
- Code that needs a service imports its module; nothing is passed through a context.
- A mount prefix starts with `/`, is not `/`, and has no trailing `/`; never mount under a worker
  path (`/rpc`, `/api/auth`) or `/ws`.
- Release everything `start` acquires in the stop function: a timer, a watcher, a connection.

**Check:** `stack generate`, then `pnpm check` passes, and `pnpm dev` logs
`service <name>: started`.
