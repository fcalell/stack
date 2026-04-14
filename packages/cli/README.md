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

Then prompts for layer-specific config (dialect, auth, organizations) and scaffolds the full project: `package.json`, `tsconfig.json`, `biome.json`, `stack.config.ts`, worker entry, app entry, and more.

## Commands

### `stack init [dir]`

Interactive project scaffold. Creates the directory if it doesn't exist, or uses the current directory.

**What it scaffolds per selection:**

| Condition | Files |
|-----------|-------|
| Always | `package.json`, `tsconfig.json`, `biome.json`, `.gitignore` |
| Database | `stack.config.ts`, `src/schema/index.ts`, `src/migrations/` |
| API | `src/worker/index.ts`, `src/worker/routes/index.ts`, `src/worker/env.d.ts`, `wrangler.toml` |
| App | `src/app/entry.tsx`, `src/app/app.tsx`, `src/app/app.css` |
| App + API | `src/app/lib/api.ts` (typed client wired to `AppRouter`) |

API auto-selects Database (requires it). App is fully independent. Existing files are never overwritten.

### `stack add <feature>`

Add a feature to an existing project. Available features:

| Feature | Precondition | What it does |
|---------|--------------|--------------|
| `db` | None | Scaffolds `stack.config.ts`, schema, migrations |
| `auth` | `db` configured | Adds `auth` section to `stack.config.ts` |
| `org` | `auth` configured | Adds `createAccessControl()` and organization config |
| `api` | `db` configured | Scaffolds worker entry, routes, wrangler.toml, adds `api` section to config |
| `ui` | None | Scaffolds app entry, CSS |

### `stack dev [--studio]`

Context-aware development mode. Detects what's configured and runs the relevant workflows:

- **Database configured:** pushes schema to local DB, watches `src/schema/` for changes (300ms debounce)
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
| App | `src/app/entry.tsx` exists |

## License

MIT
