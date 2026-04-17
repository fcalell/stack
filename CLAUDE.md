# @fcalell/stack

Full-stack framework for SolidJS + Hono + Cloudflare. Ships everything a consumer needs to build and deploy a production app — database, API, UI, tooling — so they only write business logic.

## Philosophy

**The consumer never touches underlying tools.** Plugins wrap their domain (Drizzle, Hono, oRPC, Kobalte, Vite, Tailwind) and re-export only what's needed. Consumers don't install or import `drizzle-orm`, `hono`, `zod`, `@kobalte/core`, `vite`, or `tailwindcss` directly — the stack handles it.

**Everything is opt-in and composable.** A project can use just the UI, just the database, or the full stack. Plugins declare dependencies via typed event tokens (`depends: [db.events.SchemaReady]`), the CLI auto-resolves dependencies, and `defineConfig()` validates the graph.

**Single config, plugin-driven.** `stack.config.ts` is the single source of truth — a `domain`, a `plugins` array, and optional dev settings. Each plugin contributes config, bindings, generated files, worker runtime, and CLI hooks via an event-driven lifecycle. The `stack` CLI is one command for init, dev, build, and deploy.

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
stack dev:          Generate → Dev.Configure → Dev.Start → [wrangler] → Dev.Ready
stack build:        Generate → Build.Configure → Build.Start
stack deploy:       Generate → Build → Deploy.Plan → Deploy.Execute → Deploy.Complete
stack remove:       Remove → Generate
```

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
  stack.config.ts            # defineConfig({ domain, plugins: [db(...), auth(), api(), solid(), solidUi()] })
  wrangler.toml              # consumer-owned base; .stack/wrangler.toml merges bindings
  src/
    schema/                  # Drizzle tables (business logic)
    migrations/              # generated by drizzle-kit
    worker/
      plugins/
        auth.ts              # auth.defineCallbacks() — runtime callbacks
      routes/                # business logic (procedures, auto-barreled)
      middleware.ts           # optional custom middleware
    app/
      pages/                 # file-based routes (business logic)
        _layout.tsx
        index.tsx
  .stack/                    # generated — gitignored
    env.d.ts                 # Env interface from plugin bindings
    worker.ts                # virtual worker entry (inlined options, convention-based)
    wrangler.toml            # merged wrangler config
    vite.config.ts           # generated Vite config with framework plugins
    routes.d.ts              # typed route builder declarations
```

## Config

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
