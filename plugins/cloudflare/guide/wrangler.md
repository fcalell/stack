# Wrangler config and env

`stack generate` writes `.stack/wrangler.toml` from what the plugins contribute: the database, the
rate limiters, the compatibility flags, every declared env var, and with `vite()` the web
client's `[assets]`. Never edit it. Settings of your
own go in a root `wrangler.toml`, which generate merges in.

## The root `wrangler.toml`

| Section | Merge |
| --- | --- |
| `[[d1_databases]]`, `[[kv_namespaces]]`, `[[analytics_engine_datasets]]`, `[[unsafe.bindings]]`, `compatibility_flags`, `[assets]` | Owned by the plugins: generate fails when the root file has one |
| `[[routes]]`, `[[r2_buckets]]` | Yours merge beside the plugins'. A route pattern or a binding name both sides declare fails generate |
| `name`, `compatibility_date`, `main` | Yours win; otherwise `app.name`, the plugin's pinned date and the generated worker |
| `[vars]` | Yours merge with the plugins'; a key both declare fails generate |
| Anything else (`account_id`, `observability`) | Copied as written |

Every name reaching `env` (a binding, a var, a secret) is unique across all of them, or generate
fails naming both sides.

```toml
# wrangler.toml
account_id = "…"

[[routes]]
pattern = "api.example.com/*"
zone_name = "example.com"

[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "my-app-uploads"
```

wrangler reads the generated file, so a relative path in the root file resolves against `.stack/`:
prefix it with `../`.

## `.dev.vars`

`.dev.vars` at the root holds the dev values: `STACK_DEV=1` and every declared env var at its dev
default, auth's `AUTH_SECRET` and `APP_URL` among them. It is yours to edit, and gitignored.
Generate only appends what it lacks (`STACK_DEV`, a var declared since) and mirrors the file into
`.stack/.dev.vars`, where wrangler reads it: after an edit, run `stack generate` or restart
`pnpm dev`. A var your own code reads is declared with
`api({ env: [{ name, devDefault }] })`, never added to `.dev.vars` alone.

## `Env`

`stack generate` runs `wrangler types` into `.stack/worker-configuration.d.ts`, which declares the
global `Env`: every binding and var, a `.dev.vars` var typed `string`. Type the worker's env with
it (`AuthCallbacks<Env>`). When `wrangler types` fails, generate warns and removes the file, so
`Env` stops resolving rather than going stale: run
`pnpm exec wrangler types .stack/worker-configuration.d.ts -c .stack/wrangler.toml` to see why.

## Local state

`stack dev` runs `wrangler dev` on `http://localhost:8787`, keeping the local D1, KV and caches
in `.wrangler/state` at the root, gitignored. The db plugin's local commands read the same
directory, so deleting it resets the local database. With `vite()` in the config, the dev server
proxies the worker's paths (`/rpc`, `/api/auth`), so the browser calls the worker on the page's
own origin, and `stack generate` creates `dist/client` empty until the first build fills it.

## Rules

- Set a deployed secret with `wrangler secret put`, never in a `[vars]` table or a committed file:
  see [deploy](./deploy.md).
- Never set `STACK_DEV` outside `.dev.vars`: it switches the worker to dev origins and dev
  checks.

**Check:** `stack generate` exits cleanly, then `pnpm check` passes.
