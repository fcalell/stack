# Device credentials

`auth({ devices: true })` lets a signed-in member make a named, revocable key for a machine with no
browser: an agent daemon, a sync client. The machine sends it as `Authorization: Bearer <key>` and
acts as that member. It is accepted wherever a session is: `procedure({ auth: true })` and its
scopes, the `/ws` upgrade, and a service route.

```ts
// stack.config.ts
auth({ organization: true, devices: true }),
// src/schema/index.ts
export * from "@fcalell/plugin-auth/schema/devices"; // the device key table
```

**Check:** `stack generate`, `stack db generate`, then `orpc.auth.devices.list` answers `[]`.

## The member's calls

A member signed in with a session makes, lists and revokes keys. A device key cannot.

| Procedure | Does |
| --- | --- |
| `auth.devices.create({ name, expiresInDays? })` | Answers `{ device, key }`. The key is shown once and stored hashed. Without `expiresInDays` it does not expire; the most is 365 |
| `auth.devices.list` | Each device's `id`, `name`, `start` (the key's first characters), `createdAt`, `expiresAt` and `lastUsedAt` |
| `auth.devices.revoke({ id })` | Ends the key; its next request is refused |

A name is 1 to 40 characters and a member holds 25 live keys at most (`DEVICE_LIMIT`). Make one key
per machine, so revoking a lost one ends only it.

## The machine's calls

The member pastes the key into the machine's configuration once. The machine then calls the API
with the app's own client, its `/ws` channels with a header, and its service routes with a plain
`fetch`:

```ts
// the daemon
import { createClient } from "@fcalell/plugin-api/client";
import { createWsClient } from "@fcalell/plugin-node/client";
import type { AppRouter } from "../.stack/worker";

const headers = { authorization: `Bearer ${key}` };
const api = createClient<AppRouter>({ url: `${hub}/rpc`, headers });
const ws = createWsClient({ url: `${hub.replace("http", "ws")}/ws`, headers });
await fetch(`${hub}/sync/push`, { method: "POST", headers, body });
```

A service route asks who is calling with `http.session`, which resolves the request as `/ws` does
(see the node plugin's services page):

```ts
// src/server/services/sync.ts
http.mount("/sync", async (request) => {
  const session = await http.session(request);
  if (!session) return new Response("Unauthorized", { status: 401 });
  // session.user.id is the member; session.session.id is the key's id
});
```

A procedure sees the member as `context.user` and `context.session`. `session.id` is the key's id,
`activeOrganizationId` is unset (a key has no active organization: name the organization in the
input, as a scope does), and a scope resolves the member's membership on every call, so removing
the member from an organization ends the key's reach into it at once.

A revoked, expired or unknown key answers `UNAUTHORIZED`; a key over its rate limit answers
`TOO_MANY_REQUESTS`.

## What a key cannot do

On the auth routes a key reaches the session lookup and the reads of its member's organizations,
nothing else, so a stolen key cannot mint another key, change the sign-in, delete the account or
change an organization. Those answer `FORBIDDEN` (`DEVICE_CREDENTIAL_REFUSED`). The key routes are
off HTTP: only the `auth.devices.*` procedures reach them.

Everything the app's own procedures allow its member, a key does. Give the machine its own member
in the organization, with a narrower role, when it should do less than a person.

## Rules

- A key counts each lookup: 600 a minute, and a procedure that also calls an auth endpoint counts
  two. A daemon batches its calls.
- Revoking stops the next request, not a socket already open: a channel that must honour it closes
  the socket itself.
- A machine stores the key like a password: a file only its user reads, or the operating system's
  secret store; never a log line, a URL or a repository. Send it over HTTPS only.
