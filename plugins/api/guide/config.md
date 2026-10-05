# API options

`api()` in `stack.config.ts` serves the procedures under `src/worker/routes/` from the worker.
Its CORS allow-list is no option of its own: it derives from `app.domain` and `app.origins`
(`node_modules/@fcalell/cli/guide/config.md`).

| Option | Default | What it sets |
| --- | --- | --- |
| `prefix` | `"/rpc"` | The path the RPC handler is mounted under; starts with `/` |
| `env` | `[]` | The env vars your own worker code reads, each `{ name, devDefault, validate? }` |
| `entities` | `[]` | The names of state your app keeps outside the database, for `reads` / `writes` to type |

## Env vars

Declare every var your worker code reads in `env`, never by hand in `.dev.vars` or
`wrangler.toml`:

```ts
api({ env: [{ name: "RESEND_API_KEY", devDefault: "re_dev", validate: { minLength: 8 } }] }),
```

A declared var joins the ones plugins declare: the deploy target gives it its dev default under
`stack dev` (cloudflare's `.dev.vars`, node's process env), `Env` types it, and the worker
asserts it on its first request and refuses to serve when it fails.

| `validate` hint | Refuses |
| --- | --- |
| (always) | a missing or empty value |
| `minLength: n` | a value shorter than `n` |
| `url: true` | a value that is not a URL |
| `devLocalhost: true` | under `STACK_DEV`, a URL whose host is not local: the sign of a deploy that shipped dev settings |

## Rules

- A `devDefault` satisfies its own `validate` hints, or a fresh project refuses to serve.
- A name a plugin already declares (auth's `AUTH_SECRET`, `APP_URL`) is an error: read the
  plugin's var instead of declaring it again.

**Check:** `pnpm check` passes, and `pnpm dev` serves with the var at its dev default.

## Entities

`procedure({ reads, writes })` types its names from the entities plugins declare: the Drizzle
schema's exports and auth's tables, so a table's name is already an entity. State kept anywhere
else (files, a repo, a remote service) has no table, so name it in `entities`:

```ts
api({ entities: ["settings", "repos"] }),
```

Then `procedure({ auth: true, writes: ["settings"] })` types, and a screen that reads
`settings` redraws after it. A name may contain letters, digits, `_`, `.` and `-`; a bad name
fails `stack generate`. A name a plugin already declares (a table) is an error: use the table's
name as it is. With no database and no auth, the names you list are the whole vocabulary, so
`reads` and `writes` take only them.

**Check:** `pnpm check` passes, and a `writes` name outside the vocabulary is a type error.
