# @fcalell/plugin-cloudflare

The Cloudflare Workers target for `@fcalell/stack`, the alternative to `@fcalell/plugin-node`. It
renders the plugin-api worker's wrangler config from what the other plugins contribute and runs
`wrangler` for dev and deploy.

## What it generates

- `.stack/wrangler.toml`: every contributed binding, route, var and compatibility flag, merged
  onto the consumer's own `wrangler.toml` when there is one.
  Every `api.slots.env` var is an empty `[vars]` entry; the deployed value is set once with
  `wrangler secret put`.
- `.dev.vars`: `STACK_DEV=1` and each `api.slots.env` var at its `devDefault`. The file is the
  consumer's to edit; each generate adds only what it lacks (`STACK_DEV`, a var declared since),
  and mirrors it into `.stack/.dev.vars`, where wrangler reads it.
- `.stack/worker-configuration.d.ts`: the `Env` interface, from `wrangler types`. A var in
  `.dev.vars` is typed `string`.

## Dev

`stack dev` runs `wrangler dev` on `http://localhost:8787`, with its local state (D1, KV, caches)
persisted under `.wrangler/state`, gitignored with `.wrangler`. It stays outside `.stack/`, Vite's
root, because the worker writes it on every request and each write Vite sees is a full reload.
plugin-db's local D1 commands read the same directory (`LOCAL_PERSIST`). wrangler's scratch
`.wrangler/` sits beside its config, so the bundle it rewrites on every worker edit lands in
`.stack/.wrangler/tmp/`, inside Vite's root, where Tailwind's automatic source detection scans it
and answers its change with a full reload; the plugin contributes `**/.wrangler/**` to
`vite.slots.watchIgnored`, so a worker edit leaves the open page as it is.

With `vite` in the config, the vite dev server proxies every worker-owned path
(`api.slots.routePrefixes`: api's `prefix`, auth's `/api/auth`) to it, so the browser calls the
worker on the page's own origin: the RPC and auth clients keep their relative URLs and need no
`baseURL`, and the session cookie is first-party. The worker's own origin joins
`api.slots.devTargetOrigins`, after every frontend's.

## Deploy

`stack deploy` runs `wrangler deploy --config .stack/wrangler.toml`.

## Bundling

`wrangler dev` and `wrangler deploy` both pass `--tsconfig` with the absolute path of
`cliSlots.workerTsconfig`, the tsconfig holding `virtual:stack-procedure`'s `paths`: esbuild otherwise
reads the one nearest each file, which under the split is the solution `tsconfig.json` with no
`paths`. The path is absolute because esbuild resolves a relative one against `.stack/`, the
config's directory, as it does wrangler.toml's own `tsconfig` key.

## Owned slots

| Slot | Kind | Purpose |
|------|------|---------|
| `cloudflare.slots.bindings` | `list<WranglerBindingSpec>` | D1, KV, R2, analytics engine, rate limiter and var bindings |
| `cloudflare.slots.routes` | `list<WranglerRouteSpec>` | Worker route patterns |
| `cloudflare.slots.vars` | `map<string>` | Plain `[vars]` entries |
| `cloudflare.slots.compatibilityFlags` | `list<string>` | Workers compatibility flags |
| `cloudflare.slots.compatibilityDate` | `value<string>` | The pinned compatibility date |
| `cloudflare.slots.wranglerToml` | `derived<string>` | The final `.stack/wrangler.toml` source |
