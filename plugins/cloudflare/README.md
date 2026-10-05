# @fcalell/plugin-cloudflare

The Cloudflare Workers target for `@fcalell/stack`, the alternative to `@fcalell/plugin-node`. It
renders the API worker's wrangler config from what the other plugins contribute and runs
`wrangler` for dev, types and deploy.

## Install

```bash
stack add cloudflare
```

## Guide

Using the target in an app lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`wrangler.md`](./guide/wrangler.md) and the recipe [`deploy.md`](./guide/deploy.md).

## Plugin implementation

### Owned slots

| Slot | Kind | Purpose |
| --- | --- | --- |
| `cloudflare.slots.bindings` | `list<WranglerBindingSpec>` | D1, KV, R2, analytics engine, rate limiter and var bindings |
| `cloudflare.slots.routes` | `list<WranglerRouteSpec>` | Worker route patterns |
| `cloudflare.slots.vars` | `map<string>` | Plain `[vars]` entries |
| `cloudflare.slots.compatibilityFlags` | `list<string>` | Workers compatibility flags |
| `cloudflare.slots.compatibilityDate` | `value<string>` | The pinned compatibility date, seeded from `DEFAULT_COMPATIBILITY_DATE` so generate is reproducible |
| `cloudflare.slots.wranglerToml` | `derived<string>` | The final `.stack/wrangler.toml` source: every slot above plus `api.slots.env`, merged onto the consumer's root `wrangler.toml` by `aggregateWrangler` |

### Contributions

| Target slot | Behaviour |
| --- | --- |
| `cliSlots.artifactFiles` | `.stack/wrangler.toml`, from `wranglerToml` |
| `cloudflare.slots.bindings` | `RATE_LIMITER_RPC`, 1000 requests per 60 s per IP over the API tree, when any worker path exists |
| `cliSlots.artifactFiles` | `.dev.vars` (created, or topped up with what it lacks) and its mirror `.stack/.dev.vars`, where wrangler reads it. `STACK_DEV` never enters `api.slots.env`, so it never becomes a secret |
| `api.slots.envType` | The global `Env` `wrangler types` declares, so a procedure's `context.env` is typed on Cloudflare |
| `api.slots.devTargetOrigins` | `http://localhost:8787`, unless `app.origins` is set |
| `vite.slots.serverProxy` | Every `api.slots.routePrefixes` path to the wrangler dev port |
| `vite.slots.watchIgnored` | `**/.wrangler/**`: wrangler's scratch bundle lands in `.stack/.wrangler/tmp/`, inside Vite's root, where Tailwind's source scan would answer each worker edit with a full reload |
| `cliSlots.devProcesses` | `wrangler dev --persist-to .wrangler/state` on port 8787 |
| `cliSlots.buildSteps` | `client-headers`, phase `post`: writes `<outDir>/_headers` with one `/*` rule holding `vite.slots.clientHeaders`, names sorted. Cloudflare applies the file to asset responses only, so worker paths keep the worker's headers. A `public/_headers` Vite copied into the directory fails the build: Cloudflare joins a header two rules set with a comma, so stack refuses instead of merging. No step without vite or with the slot empty |
| `cliSlots.deploySteps` | `wrangler deploy`, phase `main` |
| `cliSlots.postWrite` | `wrangler types` into `.stack/worker-configuration.d.ts`; on failure it warns and removes the file, so a stale `Env` never type-checks |

### Lifecycle

- Local state stays in `.wrangler/state` at the root, outside `.stack/` (Vite's root), because the
  worker writes it on every request. `LOCAL_PERSIST` exports the path for plugin-db's local D1
  commands.
- Every bundling wrangler command passes `--config .stack/wrangler.toml` and `--tsconfig` with the
  absolute path of `cliSlots.workerTsconfig`, which holds `virtual:stack-procedure`'s `paths`.
  esbuild otherwise reads the solution `tsconfig.json`, and resolves a relative path against
  `.stack/`.
- A rate limiter's `namespace_id` is a hash of the worker name and the binding, so apps sharing an
  account never share a counter.
