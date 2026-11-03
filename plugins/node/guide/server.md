# Node server

`node()` runs the app as one long-running Node process in place of Cloudflare Workers. The process
serves the API worker, a WebSocket endpoint at `/ws`, your background services and, with `vite()`,
the built web client from `dist/client` with every other `GET` answered by its `index.html`. It needs `api()`
and Node 24 or newer.

```ts
// stack.config.ts
import { node } from "@fcalell/plugin-node";

plugins: [
  node({ port: 8788 }),
  db({ dialect: "sqlite", path: "./data/app.sqlite" }),
  api(),
  // ...
],
```

| Option | Default | Effect |
| --- | --- | --- |
| `port` | `8788` | The listen port. The `PORT` env var overrides it in production |
| `host` | every interface | The bind address. A loopback address (`127.0.0.1`) makes the local origins of `app.origins` the production allow-list. The `HOST` env var overrides it in production |
| `bounds.body` | 16 MiB | A request body over it answers 413 |
| `bounds.frame` | 1 MiB | A WebSocket frame over it closes its socket |

## Moving from Cloudflare

Replace `cloudflare()` with `node()`, and the database with `db({ dialect: "sqlite", path })`:
`d1` runs on Cloudflare only. Remove a root `wrangler.toml` and `.dev.vars`; neither is read.

## Env

The worker's `env` is `process.env`, and `context.env` is untyped (`unknown`) in a handler: there is no
`Env` declaration here. Every var a plugin declares is checked **when the server starts**, before it
opens the port or starts a service: a missing or malformed one stops the boot with one message that
lists them all (`stack node: failed to start: the environment is incomplete: - Missing env var:
AUTH_SECRET ...`), so a hub never listens half configured. A worker on Cloudflare has no start; its
first request runs the same checks.

What a production process needs, by the plugin that declares it (a renamed var, `fileVar`,
`secretVar` or `appUrlVar`, replaces its default name):

| Plugin | Var | Needed | Rule |
| --- | --- | --- | --- |
| `db({ dialect: "sqlite" })` | `DB_FILE` | always | The database file's path. `path` is only its dev default, and `stack db` commands read the same var (see `plugin-db`'s `commands.md`) |
| `auth()` | `AUTH_SECRET` | always | At least 32 characters; signs sessions |
| `auth()` | `APP_URL` | always | The app's public origin as a URL (`https://hub.example.com`); it is the sign-in links' and cookies' origin, and `STACK_DEV` with a non-local `APP_URL` refuses to start |
| `auth({ socialProviders })` | `<PROVIDER>_CLIENT_ID`, `<PROVIDER>_CLIENT_SECRET` | per enabled provider | e.g. `GOOGLE_CLIENT_ID` |
| `api({ env })` | the names listed | as declared | Your own vars; each is required |

- Under `stack dev` each declared var the shell leaves unset gets its dev default, with
  `STACK_DEV=1`. In production set each one yourself, and never `STACK_DEV`.
- Cloudflare bindings do not exist here: a feature backed by one (auth's rate limiters) skips
  itself.

## Framing

The server answers the web client's files and its `index.html` fallback with
`Content-Security-Policy: frame-ancestors 'none'` and `X-Frame-Options: DENY`: a stack app is
never framed, and there is no option to allow it. The worker's own paths keep the headers the
worker sets.

## Dev

`stack dev` runs `node --watch .stack/server.ts` on the port. With `vite()` in the config, the dev
server proxies the worker's paths (`/rpc`, `/api/auth`) and `/ws` to it, so the browser stays on
one origin as in production.

## Production

`PORT` and `HOST` set where the process listens, over `port` and `host`, so a container or a
process manager moves it with no rebuild (a `PORT` that is not a port number stops the boot).
`stack dev` ignores both, since its proxy aims at the configured port. `HOST` moves the bind
address only: the origins baked from a loopback `host` stay.

```bash
pnpm build                       # builds dist/client
DB_FILE=/var/lib/my-app/app.sqlite AUTH_SECRET=… APP_URL=https://example.com node .stack/server.ts
```

Run `node .stack/server.ts` from the app's root under your process manager; Node strips the types
on load, so there is no compile step, but it needs the project and its dependencies on the box: a
`link:` dependency resolves into a checkout that must be there too. `stack deploy` has nothing to
ship here. To ship a directory instead, build a bundle.

## Deploy a bundle

`stack build` bundles the server after the web client is built. Beside the client's directory
(`dist/client`) it writes `dist/server/`: `server.mjs`, the server, the generated worker, your
`src/` and every dependency in one file (TypeScript, `link:` and workspace packages and `#src/*`
imports included); `migrations/`, the committed `.sql` files and the journal; and `node_modules/`,
holding only the packages with a native addon (`better-sqlite3`) and what they need to run.
Copy `dist/` to the box; it needs only `node` 24 or newer, wherever it was built, and no
checkout, install or CLI:

```bash
PORT=8788 DB_FILE=/var/lib/my-app/app.sqlite AUTH_SECRET=… APP_URL=https://example.com \
  node dist/server/server.mjs
```

- It runs from any working directory and finds the client beside itself; a relative `DB_FILE` is
  relative to where it is started.
- On the sqlite dialect it applies the committed migrations to `DB_FILE` before it listens (the
  ones `stack db apply` applies, in the same journal; run twice it changes nothing), so there is
  no `stack db apply` step. It runs no seed.
- Build on the box's platform: the native addon is the build machine's installed one, and
  `better-sqlite3`'s prebuilds for the other platforms ride with it.
- Code that reads a file by a path relative to its own module (`new URL("./x", import.meta.url)`)
  reads inside the bundle's directory, not the source's: keep such files out of the server, or
  copy them with the build. Two idioms are the exception, because the build follows them:
  a worker thread and a directory of modules.
- **A worker thread**: write the module's URL in the constructor,
  `new Worker(new URL("./scan-worker.ts", import.meta.url))` (a `fileURLToPath(...)` around the
  URL is the same). The build bundles that module on its own to `dist/server/workers/` and the
  bundle starts it from there; from source Node starts the `.ts` file. A URL held in a variable
  or built by a helper is not followed.
- **A directory of modules** (job kinds, importers): list it with `loadModules` from
  `@fcalell/plugin-node/server`, written as `await loadModules(new URL("./jobs/", import.meta.url))`.
  It answers each module's exports by file name without the extension. From source it reads the
  directory; the build lists the directory itself and imports each module into the bundle, so no
  registry file is kept by hand. A test, a declaration and an `index` are not listed, and the
  argument must be the literal `new URL(..., import.meta.url)`.

`SIGINT` and `SIGTERM` stop the services in reverse order, then the server.

## Rules

- Never import a Cloudflare binding type or `cloudflare:*` module in worker code that runs here.
- Reach the app only at an origin on its CORS list (`app.domain`, `app.origins`): the `/ws` socket
  refuses a page served from any other, with a 403 (see `services.md`, "Who is connected").
- Keep `.stack/` in production: it holds the server entry, generated by `stack build`.

**Check:** `stack generate`, then `pnpm check` passes, and `pnpm dev` logs
`stack node: listening on`.
