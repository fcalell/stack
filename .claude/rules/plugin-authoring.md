# Plugin authoring

Concrete guide for writing a `@fcalell/stack` plugin. Conventions on folder layout, hash imports, `worker/` vs `node/` split, and testing live in `.claude/rules/conventions.md` — not repeated here.

## Design paradigm

A plugin's job is to take a domain (db, auth, UI, …) and make it invisible to the consumer. Keep these paradigms in mind every time you add a new plugin or feature:

- **Automate by default.** If the plugin can generate, infer, default, or auto-wire a value, do it — don't expose an option. The target is zero hand-written glue in the consumer's repo. A new consumer-facing option is the last resort, and every option needs a sensible default.
- **Contribute, don't coordinate.** You talk to the slot graph, never to other plugins. To hand a value to plugin B, contribute to one of B's slots (`B.slots.foo.contribute(fn)`). To read a value from plugin B, declare a derived slot with `inputs: { foo: B.slots.foo }`. Never import another plugin's internals at runtime; never call into another plugin's functions to coordinate timing.
- **Speak the shared contract.** `plugin()`, `slot.*`, `ContributionCtx`, typed payloads, and AST specs are the only surface. Don't introduce a sibling mechanism (custom file formats, plugin-to-plugin hooks, globals). A third-party plugin shipped outside this repo must be able to do everything a first-party plugin does with the same interface.
- **Own the domain end-to-end.** Anything domain-specific — option types, slot definitions, codegen aggregators, runtime factories, CLI subcommands — lives in the plugin. Never leak a domain type into `@fcalell/cli`. If you catch yourself editing `packages/cli/src/` to land a feature, stop and move it.

## The `plugin()` contract

```ts
import { plugin, slot, callback } from "@fcalell/cli";

export const auth = plugin("auth", {
  label: "Authentication",
  package: undefined,            // default: `@fcalell/plugin-${name}`. Override for third-party.

  schema: authOptionsSchema,     // Zod schema — validates options + pins TOptions

  requires: ["api", "cloudflare", "db"],   // presence-only sibling plugins (nicer error messages)

  callbacks: {
    sendOTP: callback<{ email: string; code: string }>(),
  },

  commands: {
    push: { description: "Push schema", handler: async (ctx, flags) => { /* ... */ } },
  },

  dependencies: { "@fcalell/plugin-auth": "workspace:*" },  // auto-wired into cliSlots.initDeps
  devDependencies: { /* ... */ },                            // auto-wired into cliSlots.initDevDeps
  gitignore: [".wrangler"],                                  // auto-wired into cliSlots.gitignore

  slots: {
    runtimeOptions: /* slot.derived(...) */,
  },

  contributes: (self) => [
    /* ... Contribution<T>[] ... */
  ],
});
```

The returned `auth` is callable (`auth({ cookies: { prefix: "myapp" } })`) and exposes `.slots`, `.cli`, `.requires`, `.package`. When `callbacks` is declared, it also exposes `.defineCallbacks(impl)` for consumer callback files.

### Options via `schema`

Plugin options are declared as a Zod schema. `plugin()` validates the caller's input through it, applies defaults, and — because `schema?: z.ZodType<unknown, TOptions>` pins `TOptions` to `z.input<typeof schema>` — automatically types `ctx.options` and every command handler's `ctx.options`. No extra generic or annotation is needed in the plugin body.

```ts
// plugins/<name>/src/types.ts
import { z } from "zod";
export const authOptionsSchema = z.object({
  cookies: z.object({ prefix: z.string().optional() }).optional(),
  secretVar: z.string().default("AUTH_SECRET"),
});
export type AuthOptions = z.input<typeof authOptionsSchema>;
```

A plugin that genuinely has no options omits the `schema` field entirely.

## Slot primer

Four slot kinds. Each takes `{ source, name }` for identity; the `source` should be the plugin's name.

```ts
import { slot } from "@fcalell/cli";

// list — many contributions concatenated; optional sortBy for deterministic ordering
slot.list<TItem>({ source: "auth", name: "scopes", sortBy: (a, b) => a.localeCompare(b) })

// map — many contributions merged; duplicate keys throw
slot.map<TValue>({ source: "api", name: "callbacks" })

// value — 0..1 contribution; duplicate throws unless override:true; optional seed when no contribution lands
slot.value<T>({ source: "vite", name: "devServerPort", seed: (ctx) => 3000 })
slot.value<T>({ source: "solid", name: "homeScaffold", override: true, seed: (ctx) => /* ... */ })

// derived — computed from other slots; framework resolves inputs first; cycles caught at build time
slot.derived<T, I>({
  source: "auth",
  name: "runtimeOptions",
  inputs: { cors: api.slots.cors },
  compute: (inp, ctx) => /* compute T from inp + ctx */,
})
```

## Contributing to a slot

Every `Slot<T>` has a `.contribute(fn)` method. `fn` receives a `ContributionCtx` and returns a value (or `undefined` to skip).

```ts
import { cloudflare } from "@fcalell/plugin-cloudflare";

contributes: [
  cloudflare.slots.bindings.contribute((ctx) => {
    if (ctx.options.dialect !== "d1") return undefined;          // skip on sqlite
    return {
      kind: "d1",
      binding: ctx.options.binding ?? "DB_MAIN",
      databaseId: ctx.options.databaseId,
    };
  }),

  // List slots also accept arrays — push many in one shot.
  cloudflare.slots.secrets.contribute(() => [
    { name: "AUTH_SECRET", devDefault: "dev-secret" },
    { name: "APP_URL", devDefault: "http://localhost:3000" },
  ]),
],
```

**ContributionCtx** carries:
- `app: AppConfig` — top-level identity (`name`, `domain`, `origins`).
- `options: TOptions` — this plugin's validated options (typed via the plugin's schema).
- `cwd: string` — consumer's working directory.
- `fileExists(path)` / `readFile(path)` — relative to `cwd`.
- `template(name): URL` — resolves a path inside this plugin's `templates/` directory.
- `scaffold(name, target): ScaffoldSpec` — convenience for `{ source: template(name), target, plugin: thisName }`.
- `log: { info, warn, success, error }` — Clack-style logging.
- `resolve<T>(slot): Promise<T>` — pull any slot value during a contribution. Use sparingly; prefer declaring a derived slot when a value is structurally needed.

A contribution returning `undefined` is silently skipped — the canonical pattern for conditional contributions.

## Deriving from other slots

A derived slot reads other slots as inputs. The framework guarantees inputs are fully resolved before `compute` runs, so cross-plugin reads are deterministic by construction.

```ts
import { slot } from "@fcalell/cli";
import { api } from "@fcalell/plugin-api";

const runtimeOptions = slot.derived<
  Record<string, TsExpression>,
  { cors: typeof api.slots.cors }
>({
  source: "auth",
  name: "runtimeOptions",
  inputs: { cors: api.slots.cors },
  compute: (inp, ctx) => {
    const props = literalToProps(ctx.options as Record<string, unknown>);
    if (inp.cors.length > 0) {
      props.trustedOrigins = { kind: "array", items: inp.cors.map((o) => ({ kind: "string", value: o })) };
    }
    if (inp.cors.some((o) => o.startsWith("http://localhost"))) {
      props.sameSite = { kind: "string", value: "none" };
    }
    return props;
  },
});
```

This is the structural answer to "how do I order myself after another plugin": you don't. You declare what you read, and the framework runs you when those reads are ready.

## The slot catalog

Each first-party plugin exports its slots as `<plugin>.slots.*`. Use these as both contribution targets and derivation inputs.

### CLI lifecycle slots — `cliSlots` from `@fcalell/cli/cli-slots`

The cross-cutting sinks every command consumes. Plugins contribute here for files, processes, and lifecycle hooks; rarely read from these.

| Slot | Kind | Purpose |
|------|------|---------|
| `cliSlots.initPrompts` | `list<PromptSpec>` | Init/add interactive prompts |
| `cliSlots.initScaffolds` | `list<ScaffoldSpec>` | Templates copied once into the consumer repo |
| `cliSlots.initDeps` | `map<string, string>` | npm `dependencies` to add (auto-wired from `plugin({ dependencies })`) |
| `cliSlots.initDevDeps` | `map<string, string>` | npm `devDependencies` to add (auto-wired from `plugin({ devDependencies })`) |
| `cliSlots.gitignore` | `list<string>` | `.gitignore` entries (auto-wired from `plugin({ gitignore })`) |
| `cliSlots.artifactFiles` | `list<GeneratedFile>` | `{ path, content }` files written under `.stack/` (or anywhere in cwd) |
| `cliSlots.postWrite` | `list<() => Promise<void>>` | Hooks to run after artifact files land (e.g. `wrangler types`) |
| `cliSlots.devProcesses` | `list<ProcessSpec>` | Long-running dev processes spawned in parallel |
| `cliSlots.devWatchers` | `list<WatcherSpec>` | chokidar watchers attached during `stack dev` |
| `cliSlots.devReadySetup` | `list<DevReadyTask>` | One-shot tasks run after processes report ready |
| `cliSlots.buildSteps` | `list<BuildStep>` | Phase-sorted (`pre`/`main`/`post`) build steps |
| `cliSlots.deployChecks` | `list<DeployCheck>` | Pre-deploy checks displayed and confirmed |
| `cliSlots.deploySteps` | `list<DeployStep>` | Phase-sorted deploy steps |
| `cliSlots.removeFiles` | `list<string>` | Paths removed on `stack remove <plugin>` |
| `cliSlots.removeDeps` | `list<string>` | npm deps removed (auto-wired from `plugin({ dependencies })`) |
| `cliSlots.removeDevDeps` | `list<string>` | npm devDeps removed (auto-wired from `plugin({ devDependencies })`) |

### `api.slots.*` (plugin-api)

| Slot | Kind | Purpose |
|------|------|---------|
| `workerImports` | `list<TsImportSpec>` | Imports for `.stack/worker.ts` |
| `pluginRuntimes` | `list<PluginRuntimeEntry>` | Runtime entries that become `.use(xRuntime({...}))` calls |
| `middlewareEntries` | `list<MiddlewareSpec>` | Hono middleware (phase-ordered) |
| `middlewareCalls` | `derived<TsExpression[]>` | Sorted call expressions derived from `middlewareEntries` |
| `middlewareImports` | `derived<TsImportSpec[]>` | Deduplicated imports for middleware |
| `routesHandler` | `value<{ identifier } \| null>` | Routes namespace identifier (seeded from `src/worker/routes` existence) |
| `corsOrigins` | `list<string>` | Extra CORS origins (frontend plugins push localhost here) |
| `cors` | `derived<string[]>` | Final CORS list — `app.origins` verbatim, or `[https://domain, https://app.domain, ...corsOrigins]` |
| `callbacks` | `map<string, CallbackSpec>` | Plugin-name → callback identifier; spliced onto matching runtime's options |
| `workerBase` | `derived<TsExpression>` | The `createWorker({...})` call expression |
| `workerSource` | `derived<string \| null>` | Final `.stack/worker.ts` source; null when no runtimes are present |

### `cloudflare.slots.*` (plugin-cloudflare)

| Slot | Kind | Purpose |
|------|------|---------|
| `bindings` | `list<WranglerBindingSpec>` | D1 / KV / R2 / rate_limiter / var bindings |
| `routes` | `list<WranglerRouteSpec>` | Worker route patterns |
| `vars` | `map<string, string>` | Plain-text `[vars]` |
| `secrets` | `list<{ name, devDefault }>` | `.dev.vars` template entries |
| `compatibilityDate` | `value<string>` | Defaults to today; override with `value` + `override:true` |
| `wranglerToml` | `derived<string>` | Final `.stack/wrangler.toml` source (also triggers `wrangler types` via `postWrite`) |

### `vite.slots.*` (plugin-vite)

| Slot | Kind | Purpose |
|------|------|---------|
| `configImports` | `list<TsImportSpec>` | Imports for `.stack/vite.config.ts` |
| `pluginCalls` | `list<TsExpression>` | Vite plugin call expressions |
| `resolveAliases` | `list<{ find, replacement }>` | `resolve.alias` entries |
| `devServerPort` | `value<number>` | Dev server port (defaults to options.port ?? 3000) |
| `viteConfig` | `derived<string \| null>` | Final `.stack/vite.config.ts` source; null when nothing to emit |

### `solid.slots.*` (plugin-solid)

| Slot | Kind | Purpose |
|------|------|---------|
| `providers` | `list<ProviderSpec>` | JSX wrappers / siblings for `.stack/virtual-providers.tsx` (sorted by `order`) |
| `entryImports` | `list<TsImportSpec>` | Imports for `.stack/entry.tsx` |
| `mountExpression` | `value<TsExpression \| null>` | Root render call (override-able for custom mount) |
| `htmlShell` | `value<URL \| null>` | HTML shell template URL |
| `htmlHead` | `list<HtmlInjection>` | `<head>` injections (title, meta, link, script, html-attr) |
| `htmlBodyEnd` | `list<HtmlInjection>` | End-of-body injections |
| `routesPagesDir` | `derived<string \| null>` | Resolved pages directory or null when routing disabled |
| `entrySource` | `derived<string \| null>` | Final `.stack/entry.tsx` |
| `htmlSource` | `derived<string \| null>` | Final `.stack/index.html` |
| `providersSource` | `derived<string \| null>` | Final `.stack/virtual-providers.tsx` |
| `routesDtsSource` | `derived<string \| null>` | Final `.stack/routes.d.ts` |
| `homeScaffold` | `value<ScaffoldSpec>` (`override`) | Scaffold for `src/app/pages/index.tsx`; solid-ui overrides with the design-system home |

### `solidUi.slots.*` (plugin-solid-ui)

| Slot | Kind | Purpose |
|------|------|---------|
| `appCssImports` | `list<string>` | CSS `@import`s aggregated into `.stack/app.css` |
| `appCssLayers` | `list<{ name, content }>` | CSS `@layer` blocks |
| `fonts` | `derived<FontEntry[]>` | Resolved fonts (consumer options or `defaultFonts`) |
| `appCssSource` | `derived<string \| null>` | Final `.stack/app.css`; null when nothing landed |

### `auth.slots.*` (plugin-auth)

| Slot | Kind | Purpose |
|------|------|---------|
| `runtimeOptions` | `derived<Record<string, TsExpression>>` | Better Auth runtime options; reads `api.slots.cors` to derive `trustedOrigins` + `sameSite` |

## Spec types

The shapes carried by slot payloads. All exported from `@fcalell/cli/ast` (TS / TOML / HTML specs) or `@fcalell/cli/specs` (lifecycle specs).

- `ScaffoldSpec` — `{ source: URL; target: string; plugin: string }`. Used for templates copied into the consumer repo. Build with `ctx.scaffold(name, target)`.
- `TsImportSpec` — four shapes:
  ```ts
  { source: "@fcalell/plugin-db/runtime", default: "dbRuntime" }
  { source: "@cloudflare/workers-types", named: ["D1Database"], typeOnly: true }
  { source: "../src/schema", namespace: "schema" }
  { source: "tailwindcss", sideEffect: true }
  ```
- `TsExpression` — structured AST node (`call`, `identifier`, `string`, `array`, `object`, `jsx`, `arrow`, `member`, `as`, …). Pattern:
  ```ts
  // dbRuntime({ binding: "DB_MAIN", schema })
  {
    kind: "call",
    callee: { kind: "identifier", name: "dbRuntime" },
    args: [{
      kind: "object",
      properties: [
        { key: "binding", value: { kind: "string", value: "DB_MAIN" } },
        { key: "schema",  value: { kind: "identifier", name: "schema" }, shorthand: true },
      ],
    }],
  }

  // <Toaster />
  { kind: "jsx", tag: "Toaster", props: [], children: [] }
  ```
- `WranglerBindingSpec` — `d1` / `kv` / `r2` / `rate_limiter` / `var` shapes. Aggregator catches duplicate `binding` names and fails fast.
- `HtmlInjection` — `title` / `meta` / `link` / `script` / `html-attr`.
- `ProviderSpec` — `{ imports, wrap?, siblings?, order }` for JSX provider composition.
- `MiddlewareSpec` — `{ imports, call, phase: "before-cors" | "after-cors" | "before-routes" | "after-routes", order }`.
- `PluginRuntimeEntry` — `{ plugin, import, identifier, options? }` describing a `.use(xRuntime(opts))` call.
- `ProcessSpec`, `WatcherSpec`, `BuildStep`, `DeployStep`, `DeployCheck`, `PromptSpec`, `DevReadyTask`, `GeneratedFile` — exported from `@fcalell/cli/specs`.

## Why there's no ordering to think about

The slot graph derives execution order from data dependencies. A derived slot waits for its `inputs`. A list slot waits for all contributions. A `cliSlots.artifactFiles` contribution that resolves `api.slots.workerSource` waits for every contribution to `workerImports` / `pluginRuntimes` / `callbacks` / `cors` to resolve first — including peer plugins' contributions. There is no `after:`, no handler-firing order, no barrier event. If you find yourself wanting to "run after plugin X did Y," declare a derived slot whose inputs include the value Y produced.

## Templates

Templates live on disk under `plugins/<name>/templates/` as lintable source files. List them in `package.json` `files` so they're published. Plugins push `ScaffoldSpec`s into `cliSlots.initScaffolds`; the CLI copies them once and fails on duplicate targets. Use `slot.value({ override: true })` if you need a slot-driven scaffold that another plugin can replace — see `solid.slots.homeScaffold`, which `plugin-solid-ui` overrides with its design-system home page.

```ts
contributes: [
  cliSlots.initScaffolds.contribute((ctx) =>
    ctx.scaffold("schema.ts", "src/schema/index.ts")
  ),
],
```

## Testing

Drive tests through the real graph. Two helpers in `@fcalell/cli/testing`:

- `runStackGenerate({ config })` — runs the full generate procedure against a `defineConfig({ ... })` fixture. Returns `{ files, postWrite }`.
- `buildTestGraph({ config })` / `buildTestGraphFromPlugins({ plugins: [{ factory, options }] })` — returns `{ graph, collected }`. Use `graph.resolve(slot)` to assert on a specific slot value.

```ts
import { buildTestGraphFromPlugins } from "@fcalell/cli/testing";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { describe, expect, it } from "vitest";
import { db } from "./index";

describe("plugin-db cloudflare bindings", () => {
  it("contributes a d1 binding when dialect is d1", async () => {
    const { graph } = buildTestGraphFromPlugins({
      plugins: [
        { factory: cloudflare, options: {} },
        { factory: db, options: { dialect: "d1", databaseId: "abc", binding: "DB_MAIN" } },
      ],
    });

    const bindings = await graph.resolve(cloudflare.slots.bindings);

    expect(bindings).toContainEqual(
      expect.objectContaining({ kind: "d1", binding: "DB_MAIN", databaseId: "abc" }),
    );
  });
});
```

Reordering the `plugins` array in any test must leave it green — the slot graph derives ordering from data dependencies, never from array position.

`createMockCtx({ options })` is available for the rare unit test that builds a `ContributionCtx` directly. Use it sparingly: a mock ctx without `resolve` will explode on any contribution that crosses slots, which is usually the bug you wanted to catch.

## Checklist before publishing a plugin

1. Templates live on disk under `templates/` and are listed in `package.json` `files`.
2. `node/` and `worker/` are split; no cross-imports.
3. Runtime (if any) is exported from `./runtime` and takes plain options, not `PluginConfig`.
4. Commands are routable via `stack <plugin> <command>`.
5. Cross-plugin dataflow is expressed via slot imports — `B.slots.foo.contribute(...)` to push, `slot.derived({ inputs: { foo: B.slots.foo }, ... })` to read. No `requires:` for ordering (it's presence-only).
6. Every contribution is covered by a co-located test that builds a real graph (`buildTestGraphFromPlugins`) and asserts on the resolved slot value.
