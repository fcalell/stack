# @fcalell/cli

Plugin-driven CLI for the `@fcalell/stack` framework. Scaffolds projects, manages plugins, generates code, and orchestrates dev/build/deploy workflows.

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

The interactive wizard asks which plugins to include:

```
Which plugins do you want?
  Database   (@fcalell/plugin-db)
  Auth       (@fcalell/plugin-auth)
  API        (@fcalell/plugin-api)
  App        (@fcalell/plugin-app)
```

Then prompts for plugin-specific config (dialect, cookie prefix, organizations) and scaffolds the project. Boilerplate (virtual worker, env types, wrangler config, route barrels) is generated to `.stack/` automatically.

## Commands

### `stack init [dir]`

Interactive project scaffold. Creates the directory if it doesn't exist, or uses the current directory.

**What it scaffolds:**

| Condition | Files |
|-----------|-------|
| Always | `package.json`, `tsconfig.json`, `biome.json`, `.gitignore`, `stack.config.ts` |
| `db` plugin | `src/schema/index.ts`, `src/migrations/` |
| `auth` plugin | `src/worker/plugins/auth.ts` (callback template) |
| `api` plugin | `src/worker/routes/`, `wrangler.toml` (D1 only) |
| `app` plugin | `src/app/pages/_layout.tsx`, `src/app/pages/index.tsx` |

Dependencies are auto-resolved: selecting `auth` automatically adds `db`. Existing files are never overwritten. After scaffolding, `stack generate` runs to produce `.stack/` files.

**What `stack generate` produces in `.stack/` (gitignored):**

| File | When | Purpose |
|------|------|---------|
| `.stack/env.d.ts` | Any plugin declares bindings | `Env` interface from collected `BindingDeclaration`s |
| `.stack/worker.ts` | Any plugin has `WorkerContribution` | Virtual worker entry (imports runtime factories, chains `.use()`) |
| `.stack/wrangler.toml` | Worker exists | Merged wrangler config with all plugin bindings |
| `.stack/routes.d.ts` | `app` plugin enabled | Typed route builder declarations |
| `src/worker/routes/index.ts` | `api` plugin enabled | Auto-generated barrel from route files |
| `.dev.vars` | Plugins declare `secret` bindings | Template for local dev secrets |

### `stack add <plugin>`

Add a plugin to an existing project. Loads the plugin's `CliPlugin` from `@fcalell/plugin-<name>/cli`, runs its `prompt()` and `scaffold()` hooks, adds it to `stack.config.ts`, and regenerates `.stack/` files.

```bash
stack add auth    # Prompts for cookie prefix, organizations; scaffolds callback file
stack add app     # Scaffolds pages directory with layout and index
```

Checks `requires` before proceeding. If `auth` needs `db` and `db` is not configured, the CLI errors with a fix suggestion.

### `stack remove <plugin>`

Remove a plugin from the project. Checks that no other plugin depends on it, runs the plugin's `remove()` hook (which returns files to delete and packages to remove), removes it from `stack.config.ts`, and regenerates.

```bash
stack remove auth
```

### `stack generate`

Regenerates all `.stack/` files from the current config. Validates the config, discovers plugins, collects bindings (warns on collisions), runs each plugin's `generate()` hook, then produces `env.d.ts`, `worker.ts`, `wrangler.toml`, and `.dev.vars`.

```bash
stack generate
```

This runs automatically during `stack init`, `stack add`, `stack remove`, `stack dev`, and `stack build`. Run it manually after editing `stack.config.ts`.

### `stack dev [--studio]`

Plugin-driven development mode. Runs `stack generate` first, then collects `DevContribution` from each plugin:

- **`db` plugin:** pushes schema to local DB on startup, watches `src/schema/` for changes
- **`api` plugin:** starts `wrangler dev`, watches `src/worker/routes/` and regenerates the barrel on file add/remove
- **`app` plugin:** starts `stack-vite dev`
- **Built-in:** watches `stack.config.ts` and re-generates on change

Processes are color-coded and prefixed in the terminal. The `--studio` flag adds Drizzle Studio to the banner.

### `stack build`

Plugin-driven production build. Runs `stack generate`, collects `BuildContribution` from each plugin (pre/post build hooks), and builds the app if the `app` plugin is present.

### `stack deploy`

Plugin-driven deploy. Runs `stack build` first, then calls each plugin's `deploy()` hook in dependency order (e.g. `db` runs migrations before `api` deploys the worker).

### `stack db reset`

Drops and recreates the local database from schema. Deletes the SQLite file (and WAL/SHM), then re-pushes.

## Options

| Flag | Default | Applies to |
|------|---------|------------|
| `--studio` | `false` | `dev` |
| `--config <path>` | `stack.config.ts` | all commands except `init` |

## Plugin discovery

The CLI discovers plugins at runtime:

1. Reads `config.plugins` from `stack.config.ts`
2. Maps each `plugin.__plugin` name to `@fcalell/plugin-<name>/cli`
3. Dynamic-imports the default export (a `CliPlugin` implementation)
4. Sorts plugins by `requires` (topological order) before executing hooks

For `stack init`, the CLI uses a built-in `OFFICIAL_PLUGINS` registry to present the multi-select before any config exists.

## Code generation

The `generate` command produces several files:

- **`env.d.ts`** -- collects `BindingDeclaration[]` from all plugins via `bindings(options)`, maps types (`D1Database`, `RateLimiter`, etc.), and writes the `Env` interface
- **`worker.ts`** -- assembles the virtual worker from `WorkerContribution` declarations: imports runtime factories, chains `.use()` calls, includes consumer routes/middleware, and imports callback files from `src/worker/plugins/<name>.ts` when they exist
- **`wrangler.toml`** -- merges the consumer's `wrangler.toml` (if present) with generated binding sections (D1, R2, KV, rate limiters, etc.)
- **`.dev.vars`** -- generates a template for `secret`-type bindings (only if the file doesn't exist)
- **Plugin-specific files** -- each plugin's `generate(ctx)` can return additional `GeneratedFile[]` (e.g. route type declarations)

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/cli/codegen` | `generateEnvDts()`, `generateVirtualWorker()`, `generateWranglerToml()`, `collectBindings()` |
| `@fcalell/cli/discovery` | `discoverPlugins()`, `sortByDependencies()`, `OFFICIAL_PLUGINS` |

## License

MIT
