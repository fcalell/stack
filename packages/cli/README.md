# @fcalell/cli

Plugin-driven CLI and configuration system for the `@fcalell/stack` framework. Provides `defineConfig()`, `createPlugin()`, the event bus, codegen, and the `stack` binary that scaffolds projects, manages plugins, generates code, and orchestrates dev/build/deploy workflows.

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
  Solid      (@fcalell/plugin-solid)
  Solid UI   (@fcalell/plugin-solid-ui)
```

Then prompts for plugin-specific config (dialect, cookie prefix, organizations) and scaffolds the project. Boilerplate (virtual worker, env types, wrangler config) is generated to `.stack/` automatically.

## Config

`defineConfig()` is the single entry point for project configuration:

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { db } from "@fcalell/plugin-db";
import { auth } from "@fcalell/plugin-auth";
import { api } from "@fcalell/plugin-api";
import { solid } from "@fcalell/plugin-solid";
import { solidUi } from "@fcalell/plugin-solid-ui";

export default defineConfig({
  domain: "example.com",
  plugins: [
    db({ dialect: "d1", databaseId: "..." }),
    auth({ cookies: { prefix: "myapp" }, organization: true }),
    api({ cors: ["https://app.example.com"] }),
    solid(),
    solidUi(),
  ],
});
```

Returns a `StackConfig<T>` with a `.validate()` method that checks for duplicates and unsatisfied dependencies.

### Plugin extraction

```ts
import { getPlugin } from "@fcalell/cli";

const dbConfig = getPlugin(config, "db");
// dbConfig.options -- typed as DbOptions
```

## Plugin system

### `createPlugin()`

One constructor, one behavior function. This is the entire plugin contract:

```ts
import { createPlugin, callback } from "@fcalell/cli";
import { Init, Generate, Remove, Dev, Deploy } from "@fcalell/cli/events";

export const db = createPlugin("db", {
  label: "Database",
  events: ["SchemaReady"],
  depends: [],
  callbacks: { ... },
  commands: {
    push: {
      description: "Push schema to local database",
      handler: async (ctx) => { ... },
    },
  },

  config(options) {
    return { ...defaults, ...options };
  },

  register(ctx, bus, events) {
    bus.on(Init.Scaffold, (p) => {
      p.files.push({ path: "src/schema/index.ts", content: "..." });
      p.dependencies["@fcalell/plugin-db"] = "workspace:*";
    });

    bus.on(Generate, (p) => {
      p.bindings.push({ name: "DB_MAIN", type: "d1", databaseId: "..." });
    });

    bus.on(Dev.Ready, (p) => {
      p.setup.push({ name: "db-push", run: async () => { ... } });
    });

    bus.on(Deploy.Plan, (p) => {
      p.checks.push({ plugin: "db", description: "...", action: async () => { ... } });
    });
  },
});
```

The returned `db` is both a config factory (`db({ dialect: "d1" })`) and a namespace with `.events`, `.cli`, and `.defineCallbacks` (if callbacks are declared).

### Event lifecycle

Plugins subscribe to lifecycle events in their `register()` function. The CLI emits these events in order:

```
stack init / add:   Init.Prompt -> Init.Scaffold -> Generate
stack dev:          Generate -> Dev.Start -> [wrangler] -> Dev.Ready
stack build:        Generate -> Build.Start
stack deploy:       Generate -> Build -> Deploy.Plan -> Deploy.Execute -> Deploy.Complete
stack remove:       Remove -> Generate
```

Each event carries a mutable payload. Plugins push files, bindings, processes, or steps onto the payload.

### Dependencies are event imports

`depends: [db.events.SchemaReady]` replaces the old `requires: ["db"]`. The event token's `source` field tells the CLI which plugin defines it. TypeScript enforces the import; the CLI validates presence and computes topological order.

### Plugin commands

Plugins register subcommands via the `commands` field. The CLI auto-routes `stack <plugin> <command>`:

```bash
stack db push           # Push schema to local database
stack db generate       # Generate migration files
stack db apply          # Apply pending migrations
stack db status         # Show migration status
stack db reset          # Reset local database
```

### Typed callbacks

Plugins declare callback shapes with `callback<T>()`. The plugin export then provides a `defineCallbacks()` helper for consumer callback files:

```ts
// Plugin definition
export const auth = createPlugin("auth", {
  callbacks: {
    sendOTP: callback<{ email: string; code: string }>(),
    sendInvitation: callback<{ email: string; orgName: string }>(),
  },
  ...
});

// Consumer file (src/worker/plugins/auth.ts)
import { auth } from "@fcalell/plugin-auth";
export default auth.defineCallbacks({
  sendOTP({ email, code }) { ... },
  sendInvitation({ email, orgName }) { ... },
});
```

### RegisterContext

Provided to `register()`. Includes options, filesystem helpers, prompts, and `configure()` for mutating options during init prompts:

```ts
interface RegisterContext<TOptions> {
  options: TOptions;
  cwd: string;
  hasPlugin(name: string): boolean;
  configure(options: Partial<TOptions>): void;
  readFile(path: string): Promise<string>;
  fileExists(path: string): Promise<boolean>;
  log: { info, warn, success, error };
  prompt: { text, confirm, select, multiselect };
}
```

## Commands

### `stack init [dir]`

Interactive project scaffold. Creates the directory if it doesn't exist, or uses the current directory.

**What it scaffolds:**

| Condition | Files |
|-----------|-------|
| Always | `package.json`, `tsconfig.json`, `biome.json`, `.gitignore`, `stack.config.ts` |
| `db` plugin | `src/schema/index.ts`, `src/migrations/` |
| `auth` plugin | `src/worker/plugins/auth.ts` (callback template) |
| `api` plugin | `src/worker/routes/`, `wrangler.toml` |
| `solid` plugin | `src/app/pages/_layout.tsx`, `src/app/pages/index.tsx` |

Dependencies are auto-resolved: selecting `auth` automatically adds `db`. Existing files are never overwritten. After scaffolding, `stack generate` runs to produce `.stack/` files.

**What `stack generate` produces in `.stack/` (gitignored):**

| File | When | Purpose |
|------|------|---------|
| `.stack/env.d.ts` | Any plugin declares bindings | `Env` interface from collected `BindingDeclaration`s |
| `.stack/worker.ts` | Any plugin has a `./runtime` export | Virtual worker entry (inlined options, convention-based) |
| `.stack/wrangler.toml` | Worker exists | Merged wrangler config with all plugin bindings |
| `.stack/vite.config.ts` | Frontend plugin present | Generated Vite config with framework plugins |
| `.stack/routes.d.ts` | `solid` plugin enabled | Typed route builder declarations |
| `src/worker/routes/index.ts` | `api` plugin enabled | Auto-generated barrel from route files |
| `.dev.vars` | Plugins declare `secret` bindings | Template for local dev secrets |

### `stack add <plugin>`

Add a plugin to an existing project. Emits `Init.Prompt` and `Init.Scaffold` for the plugin, adds it to `stack.config.ts`, and regenerates `.stack/` files.

```bash
stack add auth    # Prompts for cookie prefix, organizations; scaffolds callback file
stack add solid   # Scaffolds pages directory with layout and index
```

Checks `depends` before proceeding. If `auth` depends on `db.events.SchemaReady` and `db` is not configured, the CLI errors with a fix suggestion.

### `stack remove <plugin>`

Remove a plugin from the project. Checks that no other plugin depends on it, emits the `Remove` event (plugins declare files to delete and packages to remove), removes it from `stack.config.ts`, and regenerates.

```bash
stack remove auth
```

### `stack generate`

Regenerates all `.stack/` files from the current config. Validates the config, emits `Generate` (plugins push bindings and files), then produces `env.d.ts`, `worker.ts`, `wrangler.toml`, and `.dev.vars`.

This runs automatically during `stack init`, `stack add`, `stack remove`, `stack dev`, and `stack build`. Run it manually after editing `stack.config.ts`.

### `stack dev [--studio]`

Plugin-driven development mode. Emits `Generate`, then `Dev.Start` and `Dev.Ready`:

- **`db` plugin:** pushes schema to local DB on startup, watches `src/schema/` for changes
- **`api` plugin:** starts `wrangler dev`, watches `src/worker/routes/` and regenerates the barrel on file add/remove
- **`solid` plugin:** starts the Vite dev server
- **Built-in:** watches `stack.config.ts` and re-generates on change

Processes are color-coded and prefixed in the terminal. The `--studio` flag adds Drizzle Studio to the banner.

### `stack build`

Plugin-driven production build. Emits `Generate`, then `Build.Start`.

### `stack deploy`

Plugin-driven deploy. Runs `stack build` first, then emits `Deploy.Plan` (plugins register checks and migration steps), `Deploy.Execute`, and `Deploy.Complete`.

### `stack <plugin> <command>`

Plugin subcommands. Each plugin defines commands in its `commands` field:

```bash
stack db push
stack db reset
```

## Options

| Flag | Default | Applies to |
|------|---------|------------|
| `--studio` | `false` | `dev` |
| `--config <path>` | `stack.config.ts` | all commands except `init` |

## Code generation

The `generate` command produces several files:

- **`env.d.ts`** -- collects `BindingDeclaration[]` from the `Generate` event payload, maps types (`D1Database`, `RateLimiter`, etc.), and writes the `Env` interface
- **`worker.ts`** -- convention-based: detects `./runtime` exports in plugin packages, inlines plugin options as JS literals, imports schema and callback files when they exist
- **`wrangler.toml`** -- merges the consumer's `wrangler.toml` (if present) with generated binding sections (D1, R2, KV, rate limiters, etc.)
- **`.dev.vars`** -- generates a template for `secret`-type bindings (only if the file doesn't exist)
- **Plugin-specific files** -- each plugin can push additional `GeneratedFile` entries onto the `Generate` payload

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/cli` | `defineConfig()`, `createPlugin()`, `callback()`, `getPlugin()`, `StackConfig`, `PluginConfig`, `BindingDeclaration`, `RegisterContext`, `CommandContext`, `CommandDefinition` |
| `@fcalell/cli/events` | `defineEvent()`, `createEventBus()`, `Event`, `EventBus`, lifecycle events (`Init`, `Generate`, `Dev`, `Build`, `Deploy`, `Remove`), payload types |
| `@fcalell/cli/codegen` | `generateEnvDts()`, `generateVirtualWorker()`, `generateWranglerToml()`, `generateDevVars()`, `collectBindings()` |
| `@fcalell/cli/discovery` | `discoverPlugins()`, `sortByDependencies()`, `loadAvailablePlugins()`, `FIRST_PARTY_PLUGINS`, `PLUGIN_NAMES` |

## License

MIT
