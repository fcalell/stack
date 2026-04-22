# @fcalell/cli

Plugin-driven CLI and configuration system for the `@fcalell/stack` framework. Provides `defineConfig()`, `plugin()`, the slot graph engine, codegen, and the `stack` binary that scaffolds projects, manages plugins, generates code, and orchestrates dev/build/deploy workflows.

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
  Database     (@fcalell/plugin-db)
  Auth         (@fcalell/plugin-auth)
  API          (@fcalell/plugin-api)
  Vite         (@fcalell/plugin-vite)
  Solid        (@fcalell/plugin-solid)
  Solid UI     (@fcalell/plugin-solid-ui)
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
import { vite } from "@fcalell/plugin-vite";
import { solid } from "@fcalell/plugin-solid";
import { solidUi } from "@fcalell/plugin-solid-ui";

export default defineConfig({
  app: { name: "my-app", domain: "example.com" },
  plugins: [
    db({ dialect: "d1", databaseId: "..." }),
    auth({ cookies: { prefix: "myapp" }, organization: true }),
    api(),
    vite(),
    solid(),
    solidUi(),
  ],
});
```

Returns a `StackConfig<T>` with a `.validate()` method that checks for duplicates and unsatisfied `requires` declarations.

### Plugin extraction

```ts
import { getPlugin } from "@fcalell/cli";

const dbConfig = getPlugin(config, "db");
// dbConfig.options -- typed as DbOptions
```

## Plugin system

### `plugin()`

One factory, no register function. The plugin contract:

```ts
import { plugin, slot, callback } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { cloudflare } from "@fcalell/plugin-cloudflare";

export const db = plugin("db", {
  label: "Database",
  schema: dbOptionsSchema,
  requires: ["cloudflare", "api"],

  dependencies: { "@fcalell/plugin-db": "workspace:*" },
  devDependencies: { "drizzle-kit": "^0.31.0" },
  gitignore: [".db-kit"],

  commands: {
    push: { description: "Push schema to local database", handler: async (ctx) => { /* ... */ } },
  },

  contributes: [
    cloudflare.slots.bindings.contribute((ctx) => ({
      kind: "d1",
      binding: ctx.options.binding ?? "DB_MAIN",
      databaseId: ctx.options.databaseId,
    })),
    cliSlots.devReadySetup.contribute((ctx) => ({
      name: "db-schema-push",
      run: async () => { /* push schema */ },
    })),
  ],
});
```

The returned `db` is both a config factory (`db({ dialect: "d1" })`) and a namespace with `.slots`, `.cli`, `.requires`, `.package`, and — when `callbacks` is declared — `.defineCallbacks(impl)`.

### Slots: a 60-second primer

Plugins coordinate through typed **slots** in a dataflow graph. Four kinds:

| Builder | Semantics |
|---------|-----------|
| `slot.list<T>({ source, name, sortBy? })` | Many contributions concatenated; optional sort key |
| `slot.map<V>({ source, name })` | Many contributions merged; duplicate keys throw |
| `slot.value<T>({ source, name, seed?, override? })` | 0..1 contribution; duplicate throws unless `override:true` |
| `slot.derived<T, I>({ inputs, compute })` | Computed from other slots; framework resolves inputs first |

Plugins **contribute** to other plugins' slots and **derive** from them. The framework resolves the graph topologically once per command, memoized. There is no event lifecycle, no `after:` field, and no plugin firing order to think about — data dependencies are the order. Cycles are caught at graph build time.

For the full contract, slot catalog, and design paradigm, see [`.claude/rules/plugin-authoring.md`](../../.claude/rules/plugin-authoring.md).

### `requires`

`requires: ["plugin"]` declares presence-only sibling-plugin names — used for nicer error messages when a sibling is missing from the consumer's config. It does NOT influence ordering. Cross-plugin ordering falls out of slot edges (a derived slot waits for its inputs; a list slot waits for all contributions).

### Plugin commands

Plugins register subcommands via the `commands` field. The CLI auto-routes `stack <plugin> <command>`:

```bash
stack db push           # Push schema to local database
stack db generate       # Generate migration files
stack db apply          # Apply pending migrations
stack db status         # Show migration status
stack db reset          # Reset local database
```

Each handler receives a `CommandContext`:

```ts
interface CommandContext<TOptions> {
  options: TOptions;
  cwd: string;
  resolve<T>(slot: Slot<T>): Promise<T>;
  log: { info, warn, success, error };
  prompt: { text, confirm, select, multiselect };
}
```

`ctx.resolve(slot)` is the escape hatch for a command handler that needs a slot value (e.g. reading the resolved CORS list to pass to a sub-process).

### Typed callbacks

Plugins declare callback shapes with `callback<T>()`. The plugin export then provides a `defineCallbacks()` helper for consumer callback files:

```ts
// Plugin definition
export const auth = plugin("auth", {
  callbacks: {
    sendOTP: callback<{ email: string; code: string }>(),
    sendInvitation: callback.optional<{ email: string; orgName: string }>(),
  },
  // ...
});

// Consumer file (src/worker/plugins/auth.ts)
import { auth } from "@fcalell/plugin-auth";
export default auth.defineCallbacks({
  sendOTP({ email, code }) { /* ... */ },
  sendInvitation({ email, orgName }) { /* ... */ },
});
```

When a plugin declares both callbacks AND a `./runtime` subpath export, the framework auto-scaffolds `src/worker/plugins/<name>.ts` from a `templates/callbacks.ts` template.

### ContributionCtx

Provided to every slot contribution and derivation:

```ts
interface ContributionCtx {
  app: AppConfig;                                   // { name, domain, origins? }
  options: TOptions;                                // this plugin's validated options
  cwd: string;
  fileExists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  template(name: string): URL;                      // resolves into this plugin's templates/
  scaffold(name: string, target: string): ScaffoldSpec;
  log: { info, warn, success, error };
  resolve<T>(slot: Slot<T>): Promise<T>;            // pull any slot value
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

Required sibling plugins are auto-resolved: selecting `auth` automatically adds `db`, `api`, and `cloudflare`. Existing files are never overwritten. After scaffolding, `stack generate` runs to produce `.stack/` files.

**What `stack generate` produces in `.stack/` (gitignored):**

| File | Source slot | Purpose |
|------|-------------|---------|
| `.stack/worker-configuration.d.ts` | `cliSlots.postWrite` (cloudflare) | `Env` interface generated by `wrangler types` |
| `.stack/worker.ts` | `api.slots.workerSource` | Virtual worker entry (inlined options, convention-based) |
| `.stack/wrangler.toml` | `cloudflare.slots.wranglerToml` | Merged wrangler config with all plugin bindings |
| `.stack/vite.config.ts` | `vite.slots.viteConfig` | Generated Vite config with framework plugins |
| `.stack/entry.tsx` | `solid.slots.entrySource` | App bootstrap |
| `.stack/index.html` | `solid.slots.htmlSource` | HTML shell |
| `.stack/virtual-providers.tsx` | `solid.slots.providersSource` | Provider composition |
| `.stack/app.css` | `solidUi.slots.appCssSource` | Aggregated stylesheet |
| `.stack/routes.d.ts` | `solid.slots.routesDtsSource` | Typed route builder declarations |
| `src/worker/routes/index.ts` | `api` artifact contribution | Auto-generated barrel from route files |
| `.dev.vars` | `cloudflare.slots.secrets` | Template for local dev secrets |

### `stack add <plugin>`

Add a plugin to an existing project. Resolves the plugin's `cliSlots.initPrompts` and `cliSlots.initScaffolds` contributions, patches `stack.config.ts`, and regenerates `.stack/`.

```bash
stack add auth    # Prompts for cookie prefix, organizations; scaffolds callback file
stack add solid   # Scaffolds pages directory with layout and index
```

Validates `requires` before proceeding. If `auth` requires `db` and `db` is not configured, the CLI errors with a fix suggestion.

### `stack remove <plugin>`

Remove a plugin from the project. Checks that no other plugin requires it, resolves the target plugin's contributions to `cliSlots.removeFiles` / `removeDeps` / `removeDevDeps`, removes it from `stack.config.ts`, and regenerates.

```bash
stack remove auth
```

### `stack generate`

Regenerates all `.stack/` files from the current config. Validates the config, resolves `cliSlots.artifactFiles` and writes each file, then resolves `cliSlots.postWrite` and awaits each hook (e.g. `wrangler types`).

This runs automatically during `stack init`, `stack add`, `stack remove`, `stack dev`, and `stack build`. Run it manually after editing `stack.config.ts`.

### `stack dev [--studio]`

Plugin-driven development mode. Runs `generate`, then resolves and orchestrates:

- `cliSlots.devProcesses` — long-running processes (wrangler dev, vite dev) spawned in parallel with prefixed/coloured output
- `cliSlots.devReadySetup` — one-shot tasks that run after processes report ready (e.g. `db-schema-push`)
- `cliSlots.devWatchers` — chokidar watchers (schema dir, route dir, `stack.config.ts`)

The `--studio` flag adds Drizzle Studio to the banner.

### `stack build`

Plugin-driven production build. Runs `generate`, then resolves `cliSlots.buildSteps` (sorted by `phase: pre | main | post` and `order`) and executes them sequentially.

### `stack deploy`

Plugin-driven deploy. Runs `stack build` first, then resolves `cliSlots.deployChecks` (displayed and confirmed) and `cliSlots.deploySteps` (executed sequentially in phase order).

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

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/cli` | `defineConfig()`, `plugin()`, `slot`, `callback()`, `getPlugin()`, `StackConfig`, `PluginConfig`, `ContributionCtx`, `CommandContext`, `CommandDefinition`, `Slot`, `Contribution` |
| `@fcalell/cli/cli-slots` | `cliSlots` — CLI-owned lifecycle slots (`artifactFiles`, `devProcesses`, `buildSteps`, …) |
| `@fcalell/cli/slots` | `slot.*` builders + `Slot`/`Contribution`/`ContributionCtx` types (re-exported on the main entry too) |
| `@fcalell/cli/graph` | `buildGraph(plugins, ctxFactory)` — low-level graph engine (commands use this through `build-graph.ts`) |
| `@fcalell/cli/specs` | Spec types: `GeneratedFile`, `ProcessSpec`, `WatcherSpec`, `BuildStep`, `DeployStep`, `DeployCheck`, `PromptSpec`, `DevReadyTask` |
| `@fcalell/cli/ast` | TS / TOML / HTML spec types + printers + builder helpers |
| `@fcalell/cli/discovery` | `discoverPlugins()`, `loadAvailablePlugins()`, `FIRST_PARTY_PLUGINS`, `PLUGIN_NAMES` |
| `@fcalell/cli/testing` | `runStackGenerate()`, `buildTestGraph()`, `buildTestGraphFromPlugins()`, `createMockCtx()` |
| `@fcalell/cli/runtime` | `RuntimePlugin` |
| `@fcalell/cli/codegen` | Reusable codegen helpers |
| `@fcalell/cli/errors` | `StackError`, `ConfigValidationError` |

## License

MIT
