# Live channels

A channel read draws a WebSocket channel's data like any other read: a frame holds it, and its
busy, stale and paused states come with it. `channelRead` from `@fcalell/plugin-node/live` turns
one `defineChannel` shape into a `Read`, with a handler per message type that folds the frame
into the current value. The first value a handler returns, the snapshot, makes the read ready.

```ts
// src/app/lib/live.ts
import { createWsClient } from "@fcalell/plugin-node/client";
import { channelRead } from "@fcalell/plugin-node/live";
import { inboxChannel } from "../../shared/channels.ts";

const ws = createWsClient();

export const inbox = channelRead(ws, inboxChannel, {
  snapshot: (_, snapshot) => snapshot,
  item: (inbox, item) => inbox && { ...inbox, items: [...inbox.items, item] },
  failed: () => {
    throw new Error("The inbox could not be read.");
  },
});
```

Create the client once and share it; every channel read rides its one socket. The client opens
that socket on its first subscribe, so one made at module level holds none before the first
channel read (before sign-in, say). A handler gets the
current value (`undefined` before the snapshot), the frame's payload and `{ client }`, to write
another read's key. Returning `undefined` changes nothing. A handler that throws fails the read:
before the snapshot it is the frame's failure, after it the read is stale with its last value
kept. The frame's Retry resubscribes, and asks a socket in its backoff to reconnect at once.

## Drawing it

A frame holds the read, and a leaf draws a selection of it, as with any read:

```tsx
const urgent = inbox.at((i) => i.items.filter((item) => item.level === "urgent"));

<Pane title="Inbox" read={inbox}>
  <List items={urgent} />
</Pane>
```

A channel read's first snapshot is held like a query's first answer: when the paint has shown, the
snapshot is written once it has stood for the minimum (`holdFor`, `QueryProvider hold`), so a
snapshot that lands just after the paint appears does not flash it. Later messages write at once.

The read stays fetching for as long as it is subscribed, and does not count as busy for that:
only a first wait or a refetch does. The subscription lasts while any frame or leaf holds the
read. The last one leaving ends it, and the value stays cached for the next.

## The connection

`ws.connection`, on the client `createWsClient` returns, is a read of the socket's own status:
`{ state: "connecting" | "open" | "lost", answered }`, where `answered` is when the server last
answered (an ISO time) and `lost` comes once the socket has been down for `PAUSE_AFTER`. It
only watches the socket and never opens it, and it stays in the query cache, so a banner
selects it like any read; the banner words the lost connection, and an act pressed while it is
lost is refused at the press and draws the generic "That didn't go through." (see the api
plugin's acts guide). A socket down for more than two seconds (`PAUSE_AFTER`) pauses
every channel read, and each frame holding one draws "Waiting for a connection" in its head;
the socket opening again resumes them, and the server's fresh snapshot replaces the value.
A shorter break says nothing.

Check: stop the server with the screen open, and the frame shows the paused line after two
seconds with its data still drawn; start it, and the line goes.
