# @fcalell/cli

Plugin-driven CLI and configuration system for the `@fcalell/stack` framework. Provides `defineConfig()`, `plugin()`, the slot graph engine, codegen, and the `stack` binary that scaffolds projects, manages plugins, generates code, and orchestrates dev/build/deploy workflows.

**Binary:** `stack`

## Install

```bash
pnpm add -D @fcalell/cli
```

## Guide

How to build an app on stack lives in `guide/`, and each plugin ships its own pages beside it.
`stack generate` writes the index, `.stack/guide.md`, from `cliSlots.guide`, and `stack init`
makes the app's `CLAUDE.md` import it. The CLI's pages are
[`provided.md`](./guide/provided.md), [`config.md`](./guide/config.md),
[`commands.md`](./guide/commands.md) and [`gap.md`](./guide/gap.md).

## Config

`defineConfig()` in `stack.config.ts` is the single entry point for project configuration
([`config.md`](./guide/config.md)). It returns a `StackConfig<T>` with a `.validate()` method that checks for duplicates and unsatisfied `requires` declarations.

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

  devDependencies: { "drizzle-kit": "^0.31.0" },
  gitignore: [".db-kit"],
  guide: [{ page: "schema", trigger: "Adding or changing a table" }],

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

For the full contract and design paradigm, see [`.helm/agents/plugin-authoring.md`](../../.helm/agents/plugin-authoring.md); the slot catalog lives in [`.helm/knowledge/architecture/slot-catalog.md`](../../.helm/knowledge/architecture/slot-catalog.md).

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

What each command does for an app, and its flags, is [`commands.md`](./guide/commands.md). Each
command resolves a fixed set of root slots:

| Command | Resolves |
|---------|----------|
| `stack init`, `stack add` | `cliSlots.initPrompts`, then renders `stack.config.ts`, then `initScaffolds`, `initDeps`, `initDevDeps`, `gitignore`, then runs `generate` |
| `stack remove` | the target plugin's `removeFiles`, `removeDeps`, `removeDevDeps`, then patches the config and runs `generate` |
| `stack generate` | `cliSlots.artifactFiles` (each written), then `cliSlots.postWrite` (each awaited) |
| `stack dev` | `generate`, then `devProcesses` (spawned together), `devReadySetup` (after every process is ready), `devWatchers` |
| `stack build` | `generate`, then `buildSteps` by `phase` and `order` |
| `stack deploy` | `build`, then `deployChecks` (shown and confirmed), then `deploySteps` by phase |
| `stack <plugin> <command>` | the plugin's `commands[name].handler(ctx)` |

What `stack generate` writes, by the slot that renders it:

| File | Source slot |
|------|-------------|
| `.stack/guide.md` | `cliSlots.guide` |
| `.stack/worker-configuration.d.ts` | `cliSlots.postWrite` (cloudflare, `wrangler types`) |
| `.stack/worker.ts` | `api.slots.workerSource` |
| `.stack/testing.ts` | `api.slots.testingSource` |
| `.stack/wrangler.toml` | `cloudflare.slots.wranglerToml` |
| `.stack/vite.config.ts` | `vite.slots.viteConfig` |
| `.stack/entry.tsx` | `react.slots.entrySource` / `expo.slots.entrySource` |
| `.stack/index.html` | `react.slots.htmlSource` |
| `.stack/app.css` | `reactUi.slots.appCssSource` |
| `.stack/virtual-providers.tsx` | `react.slots.providersSource` |
| `.stack/routeTree.gen.ts` | `cliSlots.postWrite` (react) |
| `.stack/routes.d.ts` | `react.slots.routesDtsSource` |
| `src/worker/routes/index.ts` | `api` artifact contribution |
| `.dev.vars` | `api.slots.env` (rendered by `cloudflare`) |

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/cli` | `defineConfig()`, `plugin()`, `slot`, `callback()`, `getPlugin()`, `StackConfig`, `PluginConfig`, `ContributionCtx`, `CommandContext`, `CommandDefinition`, `Slot`, `Contribution` |
| `@fcalell/cli/cli-slots` | `cliSlots` — CLI-owned lifecycle slots (`artifactFiles`, `devProcesses`, `buildSteps`, …) |
| `@fcalell/cli/slots` | `slot.*` builders + `Slot`/`Contribution`/`ContributionCtx` types (re-exported on the main entry too) |
| `@fcalell/cli/graph` | `buildGraph(plugins, ctxFactory)` — low-level graph engine (commands use this through `build-graph.ts`) |
| `@fcalell/cli/build-graph` | `buildGraphFromConfig({ config, cwd })` / `buildGraphFromDiscovered()` — validate, discover, collect, then `buildGraph`. The route every command takes to a resolved graph |
| `@fcalell/cli/css` | CSS escape and validation primitives: `cssString`, `cssUrl`, `cssIdent`, `cssVarName`, `cssTokenValue`, `cssSupportsExpression`. The shared render boundary both UI plugins wrap with their own label |
| `@fcalell/cli/specs` | Spec types: `GeneratedFile`, `ProcessSpec`, `WatcherSpec`, `BuildStep`, `DeployStep`, `DeployCheck`, `PromptSpec`, `DevReadyTask` |
| `@fcalell/cli/ast` | TS / TOML / HTML spec types + printers + builder helpers |
| `@fcalell/cli/discovery` | `discoverPlugins()`, `loadAvailablePlugins()`, `FIRST_PARTY_PLUGINS`, `PLUGIN_NAMES` |
| `@fcalell/cli/runtime` | `RuntimePlugin` |
| `@fcalell/cli/codegen` | Reusable codegen helpers |
| `@fcalell/cli/errors` | `StackError`, `ConfigValidationError` |

## License

MIT
