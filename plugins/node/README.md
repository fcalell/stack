# @fcalell/plugin-node

A long-running Node server target for `@fcalell/stack`, the alternative to
`@fcalell/plugin-cloudflare`. One process serves the API worker, the built web client and the
consumer's background services.

## Install

```bash
stack add node
```

## Guide

Using the target in an app lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`server.md`](./guide/server.md) and [`services.md`](./guide/services.md).

## Plugin implementation

Requires `api`. Subpaths: `./server` (the Node runtime: `startNodeServer`, `createNodeServer`,
`defineService`), `./ws` (the isomorphic channel contract), `./client` (the browser WebSocket
client). `node/` (codegen) and `server/` never import each other; `client/` and `server/` share
only `ws/`.

### Owned slots

| Slot | Kind | Purpose |
| --- | --- | --- |
| `serverPort` | value | The listen port, `port` or 8788 |
| `serverHost` | value | The bind address, null for every interface |
| `serverBounds` | value | The body and frame limits |
| `services` | list | `ServiceEntry` codegen entries for the server's `services` array, sorted and unique by name |
| `consumerServices` | value | Whether `src/server/services/` holds a service module |
| `serviceBarrelSource` | derived | The `src/server/services/index.ts` barrel, null without services |
| `serverSource` | derived | `.stack/server.ts`, null with no worker and no services |

### Contributions

| Target slot | Behaviour |
| --- | --- |
| `cliSlots.artifactFiles` | `.stack/server.ts` and the services barrel |
| `cliSlots.devProcesses` | `node --watch .stack/server.ts` with `STACK_DEV=1` and each `api.slots.env` var's dev default the shell leaves unset; ready on `listening on` |
| `api.slots.localOrigins` | `deployed` when `host` is a loopback address |
| `api.slots.devTargetOrigins` | `http://localhost:<port>`, unless `app.origins` is set |
| `vite.slots.serverProxy` | Every worker path, and `/ws` as a WebSocket |
| `cliSlots.devWatchers` | Rewrites the services barrel when a service file appears or goes |
| `cliSlots.removeFiles` | `src/server/` |

### Lifecycle

`.stack/server.ts` is one `startNodeServer({ ... })` call. The worker, `.stack/procedure.ts` and
the services barrel are passed as module URLs, not imports: route files import
`virtual:stack-procedure`, which plain Node resolves only through the `registerHooks` hook the
boot installs before loading them. The server mounts, in order, `/ws`, service mounts (longest
prefix wins), the worker paths, then, with `vite()`, static files from `dist/client` and the
`index.html` fallback.
Services start in order before listen and stop in reverse on `SIGINT` or `SIGTERM`; a failed boot
logs and exits 1.
