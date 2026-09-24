# @fcalell/plugin-node

A long-running Node server target for `@fcalell/stack`, the alternative to
`@fcalell/plugin-cloudflare`. One process serves the plugin-api worker (oRPC
over HTTP), static client assets from `dist/client` with SPA fallback, and
background services registered by the consumer.

## What it generates

- `.stack/server.ts`: the entry. Run it directly, no build step:
  `node .stack/server.ts`. Node 24 or newer strips the types at load.
- `src/server/services/index.ts`: a barrel over the consumer's service
  modules (`src/server/services/<name>.ts`, each default-exporting a
  `defineService(...)`).

## Dev

`stack dev` supervises `node --watch .stack/server.ts` with `STACK_DEV=1`, plus the
`devDefault` of every `api.slots.env` var the shell leaves unset, and proxies the worker paths
through the vite dev server, so the browser stays same-origin in dev exactly like prod. The
server's own `http://localhost:<port>` joins `api.slots.devTargetOrigins`: it is a dev trusted
origin after every frontend's, and `APP_URL`'s dev default when there is no frontend.

## Config

```ts
node({ port: 8788 }); // binds every interface
node({ port: 8788, host: "127.0.0.1" }); // loopback alone: the local origins of app.origins are the deployed list
node({ port: 8788, bounds: { body: 16 * 1024 * 1024, frame: 1024 * 1024 } }); // the defaults: a body over `body` bytes is 413, a frame over `frame` closes its socket
```

## Production

`stack build` builds the client to `dist/client`; then run
`node .stack/server.ts` under your process manager. `env` is `process.env`:
Workers bindings do not exist here, and binding-backed features (rate
limiters) skip themselves when absent.
