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

`stack dev` supervises `node --watch .stack/server.ts` with `STACK_DEV=1` and
proxies the worker paths through the vite dev server, so the browser stays
same-origin in dev exactly like prod.

## Config

```ts
node({ port: 8788 }); // port is the only option
```

## Production

`stack build` builds the client to `dist/client`; then run
`node .stack/server.ts` under your process manager. `env` is `process.env`:
Workers bindings do not exist here, and binding-backed features (rate
limiters) skip themselves when absent.
