# Wrangler config and env

`stack generate` writes `.stack/wrangler.toml` from what the plugins contribute: the database, the
rate limiters, the compatibility flags, every declared env var, and with `vite()` the web
client's `[assets]`. Never edit it. Settings of your
own go in a root `wrangler.toml`, which generate merges in.

## The root `wrangler.toml`

| Section | Merge |
| --- | --- |
| `[[d1_databases]]`, `[[kv_namespaces]]`, `[[analytics_engine_datasets]]`, `[[unsafe.bindings]]`, `compatibility_flags`, `[assets]` | Owned by the plugins: generate fails when the root file has one |
| `[[routes]]`, `[[r2_buckets]]`, `[[queues.producers]]`, `[[queues.consumers]]` | Yours merge beside the plugins'. A route pattern, a binding name or a consumed queue both sides declare fails generate. The plugins' own queue is one producer `QUEUE` and its consumer, on a queue named `app.name`, present when `src/worker/queue.ts` exists; a root consumer without that file fails generate |
| `[triggers]` | Copied, and checked against `src/worker/scheduled.ts`: `crons` without the file, or the file with no cron, fails generate |
| `[browser]` | Copied as written: `binding = "BROWSER"` types `env.BROWSER` |
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

[triggers]
crons = ["*/10 * * * *", "0 7 * * *"]

[browser]
binding = "BROWSER"
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
it (`AuthCallbacks<Env>`). `Env` types the procedure context too: a handler's `context.env` is
`Env`, so `context.env.APP_URL` is a `string` and a var `Env` lacks is a type error. When `wrangler types` fails, generate warns and removes the file, so
`Env` stops resolving rather than going stale: run
`pnpm exec wrangler types .stack/worker-configuration.d.ts -c .stack/wrangler.toml` to see why.

## Local state

`stack dev` runs `wrangler dev` on `http://localhost:8787`, keeping the local D1, KV and caches
in `.wrangler/state` at the root, gitignored. The db plugin's local commands read the same
directory, so deleting it resets the local database. With `vite()` in the config, the dev server
proxies the worker's paths (`/rpc`, `/api/auth`), so the browser calls the worker on the page's
own origin, and `stack generate` creates `dist/client` empty until the first build fills it.

A queue runs locally with no setup: a send to `env.QUEUE` reaches the `src/worker/queue.ts` handler in the
same `wrangler dev`. A cron never fires by itself locally; request the wrangler port to run one, naming
the expression from `[triggers]` (wrangler 4.156 needs no flag):

```bash
curl "http://localhost:8787/cdn-cgi/local/scheduled?cron=0+7+*+*+*"
```

It answers `ok` when the handler returned and a 500 when it threw. `/cdn-cgi/handler/scheduled` is
the older spelling of the same path. Local Browser Rendering downloads a headless Chrome on first use, so
the first `env.BROWSER` launch waits for it and needs network access.

## Rules

- Set a deployed secret with `wrangler secret put`, never in a `[vars]` table or a committed file:
  see [deploy](./deploy.md).
- Never set `STACK_DEV` outside `.dev.vars`: it switches the worker to dev origins and dev
  checks.

**Check:** `stack generate` exits cleanly, then `pnpm check` passes.
