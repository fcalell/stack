# Background work

Two files in `src/worker/` run work outside a request. `queue.ts` answers a Cloudflare queue batch
and `scheduled.ts` answers a cron event. A file's existence is the switch: `stack generate` mounts
each one on the worker, and no option turns either on. Both run on the Cloudflare target only (on
node, use a service in `src/server/services`), and both need a worker, a routable file in
`src/worker/routes` or a plugin runtime; `generate` refuses a file without one, naming it.

## A queue handler

```ts
// src/worker/queue.ts
import { defineQueue } from "virtual:stack-procedure";

type Job = { kind: "welcome"; email: string } | { kind: "digest"; org: string };

export default defineQueue<Job>(async (batch, { db, env }) => {
  for (const message of batch.messages) {
    try {
      if (message.body.kind === "welcome") await sendWelcome(env, message.body.email);
      else await sendDigest(db, message.body.org);
      message.ack();
    } catch {
      message.retry({ delaySeconds: 30 });
    }
  }
});
```

`batch.messages` holds each message's `id`, `body`, `attempts` and `timestamp`, with `ack()` and
`retry({ delaySeconds })` per message and `ackAll()` and `retryAll()` for the batch. Ack each
message as it succeeds: a handler that throws sends every message it has not acked back to the
queue, and the ones it acked stay done. Delivery is at least once, so write a job that can run
twice without harm. One queue carries every kind of job, so put the kind in the body and branch on
it, as above.

## A cron handler

```ts
// src/worker/scheduled.ts
import { defineScheduled } from "virtual:stack-procedure";

export default defineScheduled(async (event, { db }) => {
  switch (event.cron) {
    case "*/10 * * * *":
      await sweepStuckWork(db);
      break;
    case "0 7 * * *":
      await sendDailyDigest(db);
      break;
  }
});
```

`event.cron` is the schedule that fired, exactly as written in the root `wrangler.toml`
`[triggers]`, and `event.scheduledTime` is when it was due, in milliseconds. One handler answers
every schedule, so dispatch on `cron`. A throw is logged as a failed invocation and nothing
retries it: the next tick is the retry.

## The context

The second argument is `JobContext`, the context a procedure gets without its request. It holds
`env`, `executionCtx` (`waitUntil`), `_devMode` and whatever the plugins provide: `db`, the
`auth` runtime, `tenancy`. It has no `httpRequest`, `reqHeaders` or `resHeaders`, and no user or
session, because nothing called the job as someone. Check what the job may do in the job, not in
a scope: a job reads and writes the whole database. No plugin `fetch` and no middleware run for
it, and the env checks run first, so a worker missing a var fails the batch the way it fails a
request.

## Enqueueing and bindings

A procedure puts a job on the queue through the `QUEUE` binding on `context.env`; the queue, its
consumer settings and the cron `[triggers]` are Cloudflare's, set in plugin-cloudflare (its
`wrangler` page for the bindings and local runs, its `deploy` page for creating the queue).
The shape of a message is yours: type the body with `defineQueue<Body>` and share the type with
the code that sends it.

## Rules

- Make a job idempotent. A retry, a redelivery and a crash after the work but before the ack all
  run it again.
- Ack per message when the batch mixes work that can fail separately; `ackAll()` only when the
  batch stands or falls as one.
- Keep a request's work out of the queue when the member waits on its result; the queue is for
  what a third party's slowness must not hold up.
