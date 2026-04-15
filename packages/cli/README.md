# @fcalell/cli

CLI for the `@fcalell/stack` framework. Scaffolds projects, adds features incrementally, and orchestrates dev/deploy workflows.

**Binary:** `stack`

## Install

```bash
pnpm add -D @fcalell/cli
```

## Quick start

```bash
# Scaffold a new project
stack init my-app

# Or run inside an existing directory
stack init
```

The interactive wizard asks which layers to include:

```
Which layers do you want?
  1. Database  (@fcalell/db)
  2. API       (@fcalell/api)
  3. App       (@fcalell/ui + @fcalell/vite)
Select (comma-separated): 1, 2, 3
```

Then prompts for layer-specific config (dialect, auth, organizations) and scaffolds the project — only business-logic files. Boilerplate (entry points, CSS, type declarations, route barrels) is handled by the framework at dev/build time.

## Commands

### `stack init [dir]`

Interactive project scaffold. Creates the directory if it doesn't exist, or uses the current directory.

**What it scaffolds per selection:**

| Condition | Files |
|-----------|-------|
| Always | `package.json`, `tsconfig.json`, `biome.json`, `.gitignore` |
| Database | `stack.config.ts`, `src/schema/index.ts`, `src/migrations/` |
| API | `src/worker/index.ts`, `wrangler.toml` (D1 only) |
| App | `src/app/pages/_layout.tsx`, `src/app/pages/index.tsx`; adds `"imports": { "#/*": "./src/*" }` to `package.json` |

API auto-selects Database (requires it). App is fully independent. Existing files are never overwritten.

**What the framework generates to `.stack/` (gitignored):**

| File | When | Purpose |
|------|------|---------|
| `.stack/env.d.ts` | API configured | `Env` interface derived from config |
| `.stack/routes.d.ts` | App configured | Typed route builder declarations |
| `.stack/index.html` | App configured (no user `index.html`) | Virtual HTML entry for Vite |
| `.stack/api-client.d.ts` | App + API | Types for `virtual:fcalell-api-client` |
| `src/worker/routes/index.ts` | API configured | Auto-generated barrel from route files |

**What consumers can optionally create as overrides:**

| File | Effect |
|------|--------|
| `vite.config.ts` | Overrides the default Vite preset (used by `stack-vite` bin) |
| `src/app/entry.tsx` | Custom app entry (providers, query client, etc.) |
| `src/app/app.css` | Custom CSS (theme tokens, global overrides) |

The `#/*` Node `imports` field is the canonical path alias — it works in Vite, the Cloudflare Worker, Node scripts, and tests with no plugin or `tsconfig` `paths` configuration.

### `stack add <feature>`

Add a feature to an existing project. Available features:

| Feature | Precondition | What it does |
|---------|--------------|--------------|
| `db` | None | Scaffolds `stack.config.ts`, schema, migrations |
| `auth` | `db` configured | Adds `auth` section to `stack.config.ts` |
| `org` | `auth` configured | Adds `createAccessControl()` and organization config |
| `api` | `db` configured | Scaffolds worker entry, wrangler.toml, generates `.stack/env.d.ts` |
| `ui` | None | Scaffolds `src/app/pages/{_layout,index}.tsx` |

### `stack dev [--studio]`

Context-aware development mode. Detects what's configured and runs the relevant workflows:

- **Database configured:** pushes schema to local DB, watches `src/schema/` for changes (300ms debounce)
- **API configured:** generates `.stack/env.d.ts`, watches `src/worker/routes/` and regenerates the barrel on file add/remove
- **`--studio` flag:** launches Drizzle Studio alongside the watcher

### `stack deploy`

Context-aware production deployment:

- **Database configured:** generates migration files, then applies them

For D1 remote migrations, set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_D1_TOKEN` environment variables.

### `stack db reset`

Drops and recreates the local database from schema. Deletes the SQLite file (and WAL/SHM), then re-pushes.

## Options

| Flag | Default | Applies to |
|------|---------|------------|
| `--studio` | `false` | `dev` |
| `--config <path>` | `stack.config.ts` | `dev`, `deploy`, `db reset` |

## Detection

The CLI reads `stack.config.ts` to determine what's configured:

| Check | How |
|-------|-----|
| Database | `stack.config.ts` exists with `db` section |
| Auth | `auth` section present in config |
| Organizations | `createAccessControl` import present |
| API | `src/worker/index.ts` exists |
| App | `src/app/pages/` directory exists |

## License

MIT
