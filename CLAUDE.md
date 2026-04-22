# @fcalell/stack

Full-stack framework for SolidJS + Hono + Cloudflare. Ships everything a consumer needs to build and deploy a production app — database, API, UI, tooling — so they only write business logic.

## Philosophy

**The consumer writes only business logic.** Plugins wrap their domain (Drizzle, Hono, oRPC, Kobalte, Vite, Tailwind) and re-export only what's needed. Consumers don't install or import `drizzle-orm`, `hono`, `zod`, `@kobalte/core`, `vite`, or `tailwindcss` directly — and they don't hand-write glue code, boilerplate config, or wiring. If a value can be generated, inferred, defaulted, or auto-wired, a plugin must do it behind the scenes. A new consumer-facing option is the last resort, not the first.

**Everything is opt-in and composable.** A project can use just the UI, just the database, or the full stack. Plugins declare typed slot contributions; the framework resolves dataflow once per command. There is no plugin firing order to think about — data dependencies are the order, and the bug class of ordering surprises is structurally dead.

**CLI orchestrates; plugins contribute independently.** `@fcalell/cli` owns the lifecycle (init/dev/build/deploy), the slot graph engine, and `stack.config.ts` — nothing else. Codegen surfaces are typed slots defined on the owning plugin: `api.slots.workerSource`, `cloudflare.slots.wranglerToml`, `vite.slots.viteConfig`, `solid.slots.entrySource` / `htmlSource` / `providersSource` / `routesDtsSource`, `solidUi.slots.appCssSource`. CLI-level lifecycle slots (`cliSlots.artifactFiles`, `cliSlots.devProcesses`, …) are the cross-cutting sinks every command consumes. Plugins never import each other to coordinate; they contribute typed values to one another's slots and read shared values via derived slots. Cross-plugin handoff happens through the slot graph, never via shared mutable state.

**Plugins share one contract.** Every plugin — first-party or third-party — is built with `plugin()`, declares typed `slots`, contributes typed payloads, and speaks the same AST-spec vocabulary. A third-party plugin (e.g. `@acme/stack-plugin-widget`) composes cleanly with the official ones: same factory, same slot system, same dependency rules. When extending the framework, extend that shared interface — don't ship a new one.

**Features live in the plugin that owns the domain; core stays domain-agnostic.** `@fcalell/cli` does not know what fonts, auth, or schemas mean. Typography options go on `plugin-solid-ui`; CORS on `plugin-api`; tables on `plugin-db`; HTML `<head>` metadata on `plugin-solid`. The top-level `app` field is strictly cross-cutting identity (`name`, `domain`) — values consumed by more than one plugin. If a field only makes sense for one plugin's domain, it belongs on that plugin's options, not on `app`. Domain types (`FontEntry`, `AuthProvider`, etc.) must not leak into `@fcalell/cli`.

## Packages

| Package | Purpose |
|---------|---------|
| `@fcalell/cli` | `defineConfig()`, `plugin()`, `slot.*`, `stack` CLI, slot graph engine, codegen |
| `@fcalell/typescript-config` | tsconfig presets (base, solid-vite, node-tsx) |
| `@fcalell/biome-config` | Shareable Biome formatter/linter config |

## Plugins

Plugins are self-contained feature units built with `plugin()`. Each declares a config schema, owned slots, slot contributions, optional commands, optional callbacks, and an optional worker runtime export.

| Plugin | Purpose | Config factory |
|--------|---------|----------------|
| `@fcalell/plugin-cloudflare` | Cloudflare bindings, wrangler.toml codegen, `wrangler types` Env generation | `cloudflare()` |
| `@fcalell/plugin-db` | Drizzle ORM clients (D1/SQLite), schema tooling, migrations | `db()` |
| `@fcalell/plugin-auth` | Better Auth integration, RBAC, access control | `auth()` |
| `@fcalell/plugin-api` | API framework: Hono + oRPC, procedure builder, typed client | `api()` |
| `@fcalell/plugin-vite` | Framework-agnostic Vite lifecycle (providers virtual module) | `vite()` |
| `@fcalell/plugin-solid` | SolidJS compilation, file-based routing, app bootstrap | `solid()` |
| `@fcalell/plugin-solid-ui` | Design system: SolidJS + Kobalte + Tailwind v4 + CVA components, fonts, typography tokens | `solidUi()` |

### Dependency graph

Cross-plugin dataflow is expressed as typed slot imports — plugin A imports `pluginB.slots.foo` and either contributes to it or derives from it. The graph engine resolves topology automatically. `requires: ["plugin"]` only declares presence (for nicer error messages); ordering falls out of the slot edges.

```
@fcalell/cli               (core — defineConfig, plugin, slot.*, slot graph, CLI)

plugin-cloudflare ────────> cli (owns cloudflare.slots.bindings/secrets/vars/routes/wranglerToml)
plugin-vite ──────────────> cli (owns vite.slots.configImports/pluginCalls/devServerPort/viteConfig;
                                 contributes to api.slots.corsOrigins for localhost dev)
plugin-db ────────────────> cli, requires cloudflare + api
                                 (contributes to cloudflare.slots.bindings, api.slots.pluginRuntimes / workerImports)
plugin-auth ──────────────> cli, requires api + cloudflare + db
                                 (owns auth.slots.runtimeOptions — derived from api.slots.cors;
                                  contributes to cloudflare.slots.bindings/secrets, api.slots.pluginRuntimes/callbacks)
plugin-api ───────────────> cli (owns api.slots.workerImports/pluginRuntimes/middlewareEntries/cors/callbacks/workerSource)
plugin-solid ─────────────> cli, requires vite
                                 (owns solid.slots.providers/entry/html/routesDts;
                                  contributes to vite.slots.configImports/pluginCalls)
plugin-solid-ui ──────────> cli, requires solid + vite
                                 (owns solidUi.slots.appCss*;
                                  contributes to solid.slots.providers/homeScaffold, vite.slots.configImports/pluginCalls)
```

## Plugin System

### `plugin()`

One factory, no register function. `plugin(name, definition)` is the entire plugin contract:

```ts
import { plugin, slot, callback } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { api } from "@fcalell/plugin-api";

const runtimeOptions = slot.derived<Record<string, unknown>, { cors: typeof api.slots.cors }>({
  source: "auth",
  name: "runtimeOptions",
  inputs: { cors: api.slots.cors },
  compute: (inp, ctx) => ({ /* ... compose options from cors + ctx.options ... */ }),
});

export const auth = plugin("auth", {
  label: "Auth",
  schema: authOptionsSchema,
  requires: ["api", "cloudflare", "db"],

  callbacks: {
    sendOTP: callback<{ email: string; code: string }>(),
  },

  dependencies: {
    "@fcalell/plugin-auth": "workspace:*",
  },

  slots: { runtimeOptions },

  contributes: (self) => [
    cloudflare.slots.bindings.contribute((ctx) => ({ /* rate limiter binding */ })),
    cloudflare.slots.secrets.contribute(() => [{ name: "AUTH_SECRET", devDefault: "dev-secret" }]),
    api.slots.pluginRuntimes.contribute(async (ctx) => ({
      plugin: "auth",
      import: { source: "@fcalell/plugin-auth/runtime", default: "authRuntime" },
      identifier: "authRuntime",
      options: await ctx.resolve(self.slots.runtimeOptions),
    })),
  ],
});
```

Key fields:

- `label` — human label used in the CLI picker.
- `schema` — Zod schema for plugin options. Pins `TOptions` to `z.input<typeof schema>`; `ctx.options` is typed automatically.
- `requires` — presence-only sibling-plugin names. The CLI surfaces a missing entry with an actionable error; ordering is derived from slot edges, not from this list.
- `slots` — slots owned by this plugin. Exposed on the returned factory as `.slots` so other plugins can contribute or derive.
- `contributes` — array (or `(self) => array`) of `Contribution`s built via `someSlot.contribute(fn)`. The `self` argument carries the plugin's own slots so the plugin can reference them without forward-ref problems.
- `commands` — subcommands routed as `stack <plugin> <command>`.
- `callbacks` — typed callback slots for consumer callback files; `auth.defineCallbacks(impl)` is auto-generated when callbacks are declared.
- `dependencies` / `devDependencies` / `gitignore` — auto-wired into `cliSlots.initDeps` / `cliSlots.initDevDeps` / `cliSlots.gitignore` (and the matching `cliSlots.removeDeps` / `cliSlots.removeDevDeps` for cleanup).

### Slots

Every slot is one of four kinds, declared via `slot.list`, `slot.map`, `slot.value`, or `slot.derived`. The framework resolves the graph topologically, memoized once per command.

```ts
slot.list<TItem>({ source, name, sortBy? })          // many contributions, concatenated (optionally sorted)
slot.map<TValue>({ source, name })                   // many contributions, keys merged, duplicate-key throws
slot.value<T>({ source, name, seed?, override? })    // 0..1 contribution; duplicate throws unless override:true
slot.derived<T, I>({ source, name, inputs, compute }) // computed from other slots; cycles caught at build time
```

**Contributing** to a slot returns a `Contribution<T>`:

```ts
api.slots.cors.contribute(async (ctx) => `http://localhost:${await ctx.resolve(self.slots.devServerPort)}`)
cloudflare.slots.bindings.contribute(() => ({ kind: "d1", binding: "DB_MAIN", databaseId: "..." }))
```

`fn` may return `undefined` to skip — useful for conditional contributions (`if (!ctx.fileExists(...)) return undefined;`).

**Deriving** from other slots reads them as inputs; the framework guarantees inputs are fully resolved before `compute` runs:

```ts
slot.derived({
  inputs: { cors: api.slots.cors },
  compute: (inp, ctx) => ({ trustedOrigins: inp.cors }),
})
```

### Command procedures

Each CLI command resolves a fixed set of root slots and acts on the result. There is no event lifecycle — commands ask the graph for the values they need.

| Command | Roots resolved (order shown matches procedure) |
|---------|-----------------------------------------------|
| `stack init` / `stack add` | `cliSlots.initPrompts` → render `stack.config.ts` → `cliSlots.initScaffolds` + `initDeps` + `initDevDeps` + `gitignore` → run `generate` |
| `stack generate` | `cliSlots.artifactFiles` → write each `{ path, content }` → resolve `cliSlots.postWrite` → await each |
| `stack dev` | `generate` → `cliSlots.devProcesses` (spawn) → `cliSlots.devReadySetup` (post-ready) → `cliSlots.devWatchers` (chokidar) |
| `stack build` | `generate` → `cliSlots.buildSteps` (sorted by phase + order) → exec sequentially |
| `stack deploy` | `build` → `cliSlots.deployChecks` (display + confirm) → `cliSlots.deploySteps` → exec sequentially |
| `stack remove` | `cliSlots.removeFiles` + `removeDeps` + `removeDevDeps` filtered to target plugin → patch config → `generate` |
| `stack <plugin> <command>` | Plugin's own `commands[name].handler(ctx)` — `ctx.resolve(slot)` is the escape hatch to pull arbitrary slot values |

`cliSlots.artifactFiles` is the universal codegen sink. Plugins expose their own derived `*Source` slot (e.g. `api.slots.workerSource`) and emit a thin `cliSlots.artifactFiles.contribute(async (ctx) => ({ path, content: await ctx.resolve(self.slots.workerSource) }))`. The generate procedure is just "resolve every artifact file, write it, then run any postWrite hooks." `plugin-cloudflare` contributes a `postWrite` hook that shells out to `wrangler types` after `.stack/wrangler.toml` lands.

### Plugin commands

Plugins register subcommands via `commands`. The CLI auto-routes `stack <plugin> <command>`:

```
$ stack db push          # Push schema to local database
$ stack db generate      # Generate migration files
$ stack db apply         # Apply pending migrations
$ stack db reset         # Reset local database
```

## CLI: `stack`

```bash
stack init [dir]             # Interactive project scaffold (pick plugins)
stack add <plugin>           # Add a plugin to an existing project
stack remove <plugin>        # Remove a plugin (checks dependents)
stack generate               # Regenerate .stack/ files from config
stack dev [--studio]         # Plugin-driven dev (processes, watchers, schema push)
stack build                  # Plugin-driven production build
stack deploy                 # Plugin-driven deploy (migrations, wrangler)
stack <plugin> <command>     # Plugin subcommands (e.g. stack db push)
```

## Consumer project structure

```
my-app/
  package.json
  tsconfig.json
  biome.json
  stack.config.ts            # defineConfig({ app, plugins: [db(...), auth(), api(), solid(), solidUi()] })
  wrangler.toml              # consumer-owned base; .stack/wrangler.toml merges bindings
  src/
    schema/                  # Drizzle tables (business logic)
    migrations/              # generated by drizzle-kit
    worker/
      plugins/
        auth.ts              # auth.defineCallbacks() — runtime callbacks
      routes/                # business logic (procedures; barrel generated to index.ts)
      middleware.ts          # optional custom middleware (auto-wired via api.slots.middlewareEntries)
    app/
      pages/                 # file-based routes (business logic)
        index.tsx            # `_layout.tsx` is optional; plugin-solid ships a default
    app.css                  # optional consumer CSS; imported by .stack/app.css if present
  .stack/                    # generated — gitignored
    worker-configuration.d.ts # Env interface generated by `wrangler types`
    worker.ts                # virtual worker entry from api.slots.workerSource
    wrangler.toml            # merged wrangler config from cloudflare.slots.wranglerToml
    vite.config.ts           # Vite config from vite.slots.viteConfig
    entry.tsx                # app bootstrap from solid.slots.entrySource
    index.html               # HTML shell from solid.slots.htmlSource
    app.css                  # aggregated stylesheet from solidUi.slots.appCssSource
    virtual-providers.tsx    # composition surface from solid.slots.providersSource
    routes.d.ts              # typed route builder declarations from solid.slots.routesDtsSource
```

## Config

`defineConfig` takes a required top-level `app` field with cross-cutting identity (`name`, `domain`), plus the `plugins` array. Domain-specific config — including HTML `<head>` metadata — lives on the plugin that owns the surface.

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
  app: {
    name: "my-app",           // REQUIRED — wrangler worker name, default auth cookie prefix, fallback <title>
    domain: "example.com",    // REQUIRED — drives CORS, trustedOrigins, app URL construction
    origins: [                // OPTIONAL — overrides the auto-derived CORS allow-list
      "https://example.com",
      "https://app.example.com",
      "http://localhost:3000",
    ],
  },
  plugins: [
    db({ dialect: "d1", databaseId: "..." }),
    auth({ cookies: { prefix: "myapp" }, organization: true }),
    api(),
    vite(),
    solid({
      title: "My App",                  // optional — <title>; defaults to app.name
      description: "...",               // optional — <meta name="description">
      icon: "./public/favicon.svg",     // optional — <link rel="icon">
      themeColor: "#000000",            // optional — <meta name="theme-color">
      lang: "en",                       // optional — <html lang>; defaults to "en"
    }),
    solidUi(),
  ],
});
```

`app.name` flows into the generated `wrangler.toml` and is the fallback `<title>`; `app.domain` drives the seed of `api.slots.cors` (`https://${domain}` + `https://app.${domain}`, plus the vite dev-port localhost origin contributed by `plugin-vite` when present) and auth's derived `trustedOrigins`. Set `app.origins` to override the derived allow-list entirely. HTML `<head>` metadata is owned by `plugin-solid` via `solid.slots.htmlHead`; a worker-only project needs none of it.

Every plugin the consumer depends on must be listed explicitly — there is no implicit-resolution layer. `plugin-solid` requires `plugin-vite`, so both appear in the config. `stack init` auto-adds the missing dependency when you pick `solid` in the interactive picker.

## Runtime Architecture

`stack.config.ts` is never imported by the worker. The slot graph reads config at generate time and inlines plugin options as JS literals into the file produced by `api.slots.workerSource`. Runtime factories receive plain option objects.

Generated `.stack/worker.ts` (composed by `api.slots.workerSource` from contributions to `api.slots.workerImports` / `pluginRuntimes` / `callbacks` / `cors`):

```ts
import createWorker from "@fcalell/plugin-api/runtime";
import dbRuntime from "@fcalell/plugin-db/runtime";
import authRuntime from "@fcalell/plugin-auth/runtime";
import * as schema from "../src/schema";
import authCallbacks from "../src/worker/plugins/auth";
import * as routes from "../src/worker/routes";

const worker = createWorker({
  cors: ["https://example.com", "https://app.example.com"],
})
  .use(dbRuntime({ binding: "DB_MAIN", schema }))
  .use(authRuntime({ trustedOrigins: ["https://example.com", "https://app.example.com"], callbacks: authCallbacks }))
  .handler(routes);

export type AppRouter = typeof worker._router;
export default worker;
```

## Commands

```bash
pnpm check            # Lint (Biome) + type-check all packages
pnpm test             # Run all tests once (vitest run)
pnpm test:watch       # Run tests in watch mode (vitest)
```

## Testing

Vitest workspace at the root orchestrates per-package test projects. Tests live next to the code they test as `*.test.ts` files.

**Test projects:** `packages/cli`, `plugins/cloudflare`, `plugins/db`, `plugins/auth`, `plugins/api`, `plugins/vite`, `plugins/solid`, `plugins/solid-ui`, `tests/integration`.

### Principles

A test that passes while the production code is broken is worse than no test — it actively misleads. Three rules keep tests honest:

- **Exercise the production entry point. Never replicate its orchestration in test setup.** If production runs `discoverPlugins → buildGraphFromConfig → resolve(rootSlot)`, the test takes a `StackConfig` (the same type `stack.config.ts` exports) and runs through the same path. Hand-building a graph from synthetic plugins, hand-feeding a derivation's `compute` synthetic inputs, or constructing slot values the resolver wouldn't produce decouples the test from reality — the bugs that matter live in the glue you just skipped. When you catch yourself writing test-setup code that mirrors production wiring, delete it and call the real thing.
- **Assert on outcomes, not on intermediate strings.** `expect(workerSource).toContain("callbacks")` can be green while the callback never fires at runtime. When the artifact is runnable, run it: spawn the CLI subprocess for `stack` commands, boot the emitted worker under miniflare for worker behavior, parse the emitted config and import it for type checks. String-level assertions are supporting evidence, not the primary assertion.
- **Arrange inputs the way consumers do.** Plugin arrays in `stack.config.ts` are consumer-ordered; tests that hand-order them for assertion convenience hide dependency-graph bugs. Use the public surface — `defineConfig`, `plugin`, the same loader `stack generate` uses — as your fixture boundary. Reordering `config.plugins` in any test should leave it green; the slot graph derives ordering from data dependencies, not array position.

When in doubt: if you deleted the test and kept the production change, would a real consumer still succeed? If the test can pass on inputs a real consumer can't produce, it's not testing what you think.

### Writing tests

- Co-locate test files: `src/foo.ts` -> `src/foo.test.ts`
- Import from `vitest`: `import { describe, expect, it, vi } from "vitest"`
- Integration-level: drive `runStackGenerate({ config })` from `@fcalell/cli/testing`. It runs the same `generateFromConfig` the CLI calls, returns `{ files, postWrite }`.
- Unit-level on a slot: build a real graph with `buildTestGraph({ config })` or `buildTestGraphFromPlugins({ plugins: [...] })`, then `await graph.resolve(api.slots.cors)` and assert on the value. Allowed *in addition to* a full-path test, not *instead of* one.
- For mock contexts when needed, `createMockCtx({ options })` returns a stub `ContributionCtx` — but prefer driving through a real graph whenever possible.

### Development workflow

1. Write or update the implementation
2. Add/update tests covering the change — run `pnpm test` to verify
3. Run `pnpm check` (lint + type-check)

All three must pass before a change is considered complete.

> Coding conventions live in `.claude/rules/`.
