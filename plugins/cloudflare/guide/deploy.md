# Deploy to Cloudflare

`stack deploy` ships the worker, and with `vite()` the web client, to Cloudflare Workers. Work the steps in order; each names the
page it needs and ends with its check.

## What `stack deploy` does

1. Runs `stack build`, which regenerates `.stack/`, builds the web client to `dist/client` and
   writes `dist/client/_headers`, which makes every asset unframeable (`frame-ancestors 'none'`,
   `X-Frame-Options: DENY`): a stack app is never framed and has no option to be. A
   `public/_headers` fails the build; remove it.
2. Runs every pre-deploy check. With a D1 database: a placeholder `databaseId`, a schema change
   with no committed migration, or a newest migration that drops a table or column without its
   `-- stack:allow-destructive` marker each stop the deploy here.
3. Lists the plan (the committed migrations) and, in a terminal, asks to proceed.
4. Applies the pending migrations to the remote database, then `src/schema/seed.ts` when it
   exists.
5. Runs `wrangler deploy --config .stack/wrangler.toml`, which uploads the worker and, with
   `vite()`, `dist/client` as its static assets. The worker answers its own paths (`/rpc/*`,
   `/api/auth/*`); any other path is a file from `dist/client`, else its `index.html`.

## 1. Sign in to Cloudflare

Run `pnpm exec wrangler login`, or set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` where
the deploy runs. Put `account_id` in the root `wrangler.toml` when the login reaches more than
one account. Page: [wrangler](./wrangler.md).

**Check:** `pnpm exec wrangler whoami` names the account.

## 2. Point at real resources

`db({ dialect: "d1", databaseId })` holds the remote database's id, never a placeholder. A route
or a custom domain goes in the root `wrangler.toml` as `[[routes]]`. Page:
[wrangler](./wrangler.md).

**Check:** `stack generate` exits cleanly, and `.stack/wrangler.toml` names the database id and
the routes.

## 3. Set every secret

Each declared env var's production value is a secret, set once per var. List them from `.dev.vars` (every line but `STACK_DEV`) and set each:

```bash
pnpm exec wrangler secret put AUTH_SECRET --config .stack/wrangler.toml
```

`AUTH_SECRET` is 32 characters or more; `APP_URL` is the app's public `https://` URL. Page: auth's
config page (`node_modules/@fcalell/plugin-auth/guide/config.md`) for auth's vars.

**Check:** `pnpm exec wrangler secret list --config .stack/wrangler.toml` lists every var.

## 4. Deploy

Commit the migrations, then run `pnpm run deploy` (`pnpm deploy` is pnpm's own command).

**Check:** the deploy ends with `Deployed`, and a request to the worker answers: one with a
missing secret fails its first request with `Missing env var: <NAME>`.
