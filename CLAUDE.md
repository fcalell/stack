# @fcalell/stack

Full-stack framework for SolidJS + Hono + Cloudflare. Ships everything a consumer needs to build and deploy a production app — database, API, UI, tooling — so they only write business logic.

## Philosophy

**The consumer writes only business logic.** Plugins wrap their domain (Drizzle, Hono, oRPC, Kobalte, Vite, Tailwind) and re-export only what's needed. Consumers don't install or import `drizzle-orm`, `hono`, `zod`, `@kobalte/core`, `vite`, or `tailwindcss` directly — and they don't hand-write glue code, boilerplate config, or wiring. If a value can be generated, inferred, defaulted, or auto-wired, a plugin must do it behind the scenes. A new consumer-facing option is the last resort, not the first.

**Everything is opt-in and composable.** A project can use just the UI, just the database, or the full stack. Plugins declare dependencies via typed event tokens (`depends: [db.events.SchemaReady]`), the CLI auto-resolves dependencies, and `defineConfig()` validates the graph.

**CLI orchestrates; plugins contribute independently.** `@fcalell/cli` owns the lifecycle (init/dev/build/deploy), the event bus, codegen aggregation, and `stack.config.ts` — nothing else. Plugins never import each other to coordinate; they contribute to typed event payloads (`Codegen.Worker`, `Codegen.Wrangler`, `Composition.Providers`, …) and the CLI aggregates the results. Cross-plugin handoff happens via events or shared codegen payloads, never via shared mutable state.

**Plugins share one contract.** Every plugin — first-party or third-party — is built with `createPlugin()`, receives a `RegisterContext`, and speaks the same event + AST-spec vocabulary. A third-party plugin (e.g. `@acme/stack-plugin-widget`) composes cleanly with the official ones: same lifecycle hooks, same codegen surfaces, same dependency rules. When extending the framework, extend that shared interface — don't ship a new one.

**Features live in the plugin that owns the domain; core stays domain-agnostic.** `@fcalell/cli` does not know what fonts, auth, or schemas mean. Typography options go on `plugin-solid-ui`; CORS on `plugin-api`; tables on `plugin-db`; HTML `<head>` metadata on `plugin-solid`. The top-level `app` field is strictly cross-cutting identity (`name`, `domain`) — values consumed by more than one plugin. If a field only makes sense for one plugin's domain, it belongs on that plugin's options, not on `app`. Domain types (`FontEntry`, `AuthProvider`, etc.) must not leak into `@fcalell/cli`.

## Packages

| Package | Purpose |
|---------|---------|
| `@fcalell/cli` | `defineConfig()`, `createPlugin()`, `stack` CLI, event bus, codegen |
| `@fcalell/ui` | Design system: SolidJS + Kobalte + Tailwind v4 + CVA (runtime components) |
| `@fcalell/typescript-config` | tsconfig presets (base, solid-vite, node-tsx) |
| `@fcalell/biome-config` | Shareable Biome formatter/linter config |

## Plugins

Plugins are self-contained feature units built with `createPlugin()`. Each provides a config factory, event handlers for lifecycle hooks, optional worker runtime, and optional Vite plugins.

| Plugin | Purpose | Config factory |
|--------|---------|----------------|
| `@fcalell/plugin-db` | Drizzle ORM clients (D1/SQLite), schema tooling, migrations | `db()` |
| `@fcalell/plugin-auth` | Better Auth integration, RBAC, access control | `auth()` |
| `@fcalell/plugin-api` | API framework: Hono + oRPC, procedure builder, typed client | `api()` |
| `@fcalell/plugin-vite` | Framework-agnostic Vite lifecycle (Tailwind, FOUC, fonts) — implicit | `vite()` |
| `@fcalell/plugin-solid` | SolidJS compilation, file-based routing, app bootstrap | `solid()` |
| `@fcalell/plugin-solid-ui` | Design system CLI plugin — manages `@fcalell/ui` | `solidUi()` |

### Dependency graph

```
@fcalell/cli               (core — defineConfig, createPlugin, events, CLI)
@fcalell/ui                (runtime — SolidJS design system components)

plugin-vite ──────────────> cli (framework-agnostic Vite lifecycle, implicit)
plugin-db ────────────────> cli
plugin-auth ──────────────> cli, plugin-db (via db.events.SchemaReady)
plugin-api ───────────────> cli
plugin-solid ─────────────> cli, plugin-vite (via vite.events.ViteConfigured)
plugin-solid-ui ──────────> cli, plugin-solid (via solid.events.SolidConfigured)
```

## Plugin System

### createPlugin

One constructor, one behavior function. `createPlugin(name, { ..., register })` is the entire plugin contract:

```ts
import { createPlugin, callback } from "@fcalell/cli";
import { Init, Generate, Remove, Dev } from "@fcalell/cli/events";

export const db = createPlugin("db", {
  label: "Database",
  events: ["SchemaReady"],
  depends: [],
  callbacks: { ... },
  commands: { push: { ... }, reset: { ... } },
  config(options) { return { ...defaults, ...options }; },
  register(ctx, bus, events) {
    bus.on(Init.Scaffold, (p) => { p.files.push(...); });
    bus.on(Generate, (p) => { p.bindings.push(...); });
    bus.on(Dev.Ready, (p) => { p.setup.push(...); });
  },
});
```

### Event lifecycle

```
stack init / add:   Init.Prompt → Init.Scaffold → Generate
stack dev:          Generate → Dev.Start → [wrangler] → Dev.Ready
stack build:        Generate → Build.Start
stack deploy:       Generate → Build → Deploy.Plan → Deploy.Execute → Deploy.Complete
stack remove:       Remove → Generate
```

During `Generate`, plugins contribute typed specs to `Codegen.*` events (`Worker`, `Wrangler`, `Env`, `ViteConfig`, `Entry`, `Html`, `AppCss`, `RoutesDts`) and `Composition.Providers` / `Composition.Middleware`. The CLI aggregates contributions and writes the files in `.stack/`.

### Dependencies are event imports

`depends: [db.events.SchemaReady]` replaces `requires: ["db"]`. The event token's `source` field tells the CLI which plugin defines it. TypeScript enforces the import; the CLI validates presence and computes topological order.

### Plugin commands

Plugins register subcommands via the `commands` field. The CLI auto-routes `stack <plugin> <command>`:

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
      middleware.ts          # optional custom middleware (wired via Composition.Middleware)
    app/
      pages/                 # file-based routes (business logic)
        index.tsx            # `_layout.tsx` is optional; plugin-solid ships a default
    app.css                  # optional consumer CSS; imported by .stack/app.css if present
  .stack/                    # generated — gitignored
    env.d.ts                 # Env interface from Codegen.Env contributions
    worker.ts                # virtual worker entry (inlined options, convention-based)
    wrangler.toml            # merged wrangler config
    vite.config.ts           # Vite config from Codegen.ViteConfig contributions
    entry.tsx                # app bootstrap (generated; never edit)
    index.html               # HTML shell with <head> injections from Codegen.Html
    app.css                  # aggregated stylesheet; consumer's src/app.css is imported if present
    virtual-providers.tsx    # composition surface for Composition.Providers contributions
    routes.d.ts              # typed route builder declarations
```

## Config

`defineConfig` takes a required top-level `app` field with cross-cutting identity (`name`, `domain`), plus the `plugins` array. Domain-specific config — including HTML `<head>` metadata — lives on the plugin that owns the surface.

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { db } from "@fcalell/plugin-db";
import { auth } from "@fcalell/plugin-auth";
import { api } from "@fcalell/plugin-api";
import { solid } from "@fcalell/plugin-solid";
import { solidUi } from "@fcalell/plugin-solid-ui";

export default defineConfig({
  app: {
    name: "my-app",           // REQUIRED — wrangler worker name, default auth cookie prefix, fallback <title>
    domain: "example.com",    // REQUIRED — CORS, trustedOrigins, app URL construction
  },
  plugins: [
    db({ dialect: "d1", databaseId: "..." }),
    auth({ cookies: { prefix: "myapp" }, organization: true }),
    api({ cors: ["https://app.example.com"] }),
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

`app.name` flows into the generated `wrangler.toml` and is the fallback `<title>`; `app.domain` drives CORS and auth trusted origins. HTML `<head>` metadata is owned by `plugin-solid` via `Codegen.Html`; a worker-only project needs none of it.

Note: `plugin-vite` is implicit — auto-resolved as a dependency of `plugin-solid`.

## Runtime Architecture

`stack.config.ts` is never imported by the worker. Codegen reads config at generate time and inlines plugin options as JS literals. Runtime factories receive plain option objects.

Generated `.stack/worker.ts`:
```ts
import createWorker from "@fcalell/plugin-api/runtime";
import dbRuntime from "@fcalell/plugin-db/runtime";
import authRuntime from "@fcalell/plugin-auth/runtime";
import * as schema from "../src/schema";
import authCallbacks from "../src/worker/plugins/auth";
import * as routes from "../src/worker/routes";

const worker = createWorker({ domain: "example.com", cors: [...] })
  .use(dbRuntime({ binding: "DB_MAIN", schema }))
  .use(authRuntime({ cookies: { prefix: "myapp" }, callbacks: authCallbacks }))
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

**Test projects:** `packages/cli`, `plugins/db`, `plugins/auth`, `plugins/api`, `plugins/vite`, `plugins/solid`, `plugins/solid-ui`, `tests/integration`.

### Writing tests

- Co-locate test files: `src/foo.ts` -> `src/foo.test.ts`
- Import from `vitest`: `import { describe, expect, it, vi } from "vitest"`
- Use `createEventBus()` from `@fcalell/cli/events` for plugin register tests
- Use `RegisterContext` from `@fcalell/cli` for mock context types
- Test event handlers by emitting events and asserting on returned payload mutations

### Development workflow

1. Write or update the implementation
2. Add/update tests covering the change — run `pnpm test` to verify
3. Run `pnpm check` (lint + type-check)

All three must pass before a change is considered complete.

> Coding conventions live in `.claude/rules/`.
