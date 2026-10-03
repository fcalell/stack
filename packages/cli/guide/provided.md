# What stack gives you

Stack derives everything below from `stack.config.ts` and the app's source. A feature's shape,
scope and estimate leave it out: never spec, build or estimate a row, and never rebuild one in
the app. Each row's domain is a section of `.stack/guide.md`, whose pages hold the detail; a
domain missing from the config arrives with `stack add <plugin>`.

| Domain | Stack derives | The app writes |
| --- | --- | --- |
| auth | Sign-in by email code, Google, Apple and passkeys; sessions and cookies; organizations, members, invitations and roles; the `/api/auth` endpoints; sign-in rate limits (on cloudflare) | The `sendOTP` callback (and `sendInvitation` when the app invites) in `src/worker/plugins/auth.ts`, the auth tables' re-export in `src/schema/index.ts`, the sign-in screens |
| auth | Session, scope membership and role checks from one `procedure()` line; the caller's abilities on the client | The roles, and `auth`, `scope` and `can` per procedure |
| db | The database client in every procedure; in `stack dev`, the local database pushed on each schema save and seeded from `seed.ts` | The tables in `src/schema/`, and the seed |
| db | A deploy that refuses schema drift, an unacknowledged drop and a placeholder database id, then applies pending migrations and the seed | `stack db generate` after a schema change, its migration committed |
| api | The worker: CORS from `app.domain`, logging, secure headers, the RPC tree's CSRF guard, a liveness route, a per-IP ceiling (on cloudflare), env checks on the first request | Nothing; its own guard or raw route goes in the middleware files |
| api | The router barrel over `src/worker/routes/` | The procedures |
| api | The typed client on web and phone; cache invalidation; cursor pagination from `paginated: true` | `reads` and `writes` on each procedure |
| api | `.stack/testing.ts`: the worker booted under node, a fresh database per boot on D1, users and members signed in by one call | The tests |
| cloudflare | `.stack/wrangler.toml` with every binding, flag and var; `.dev.vars` with dev defaults; the `Env` type; `wrangler dev` with persisted local state | Each deployed secret, once, with `wrangler secret put`; `[assets]` in the app's own `wrangler.toml` to host the web client |
| node | The server serving the worker and the built client with SPA fallback; the services barrel | The services in `src/server/services/` |
| react | The HTML shell and `<head>`, the entry, the providers module, the Vite config, typed routes, memoization by the React Compiler, same-origin API calls in dev | The routes and what they import |
| react-ui, native-ui | The roster and its look: stylesheet or native theme, fonts, dark mode, density, safe areas, English words | Screens composed from the roster, the theme knobs, other languages' words |
| expo | Metro and Expo configs, the router entry, typed routes, the native client stamped with its build, the version gate, EAS build and update commands | The screens, and the update-wall screen the gate signals |
| cli | One `stack dev` for every process and watcher; one `stack deploy` that builds, checks, migrates, seeds and deploys; the tsconfigs, the lint config, this guide's index | `stack.config.ts` |

## Rules

- A feature spec names only the app's own work: its tables, procedures, screens and callbacks.
  A line that rebuilds a row (a login flow, a migration check, a fetch wrapper, an invalidation
  call, a theme) is cut.
- A row that falls short of the feature is a gap, filed by the [gap](./gap.md) recipe, never
  rebuilt in the app.

**Check:** no line of the spec or the estimate covers a row's "Stack derives" column.
