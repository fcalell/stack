# @fcalell/stack

A full-stack framework for SolidJS, Hono, and Cloudflare. The stack ships database, API, UI, and tooling as composable packages so a project only contains business logic.

## What you get

- **Database** — Drizzle ORM for Cloudflare D1 and SQLite, with optional Better Auth integration.
- **API** — Hono and oRPC wrapped behind a procedure builder with auth, RBAC, rate limiting, and pagination.
- **UI** — SolidJS design system built on Kobalte, Tailwind v4, and CVA.
- **Tooling** — A `stack` CLI that scaffolds projects, runs dev workflows, and deploys. Vite, TypeScript, and Biome presets included.

Consumers never install or import `drizzle-orm`, `hono`, `zod`, `@kobalte/core`, `vite`, or `tailwindcss` directly. The stack wraps them.

## Quick start

```bash
pnpm add -D @fcalell/cli
pnpm exec stack init my-app
```

The interactive wizard asks which layers to include (Database, API, App), prompts for layer-specific options, and scaffolds a working project. From inside the project:

```bash
stack dev               # context-aware dev (schema watch, local DB push)
stack dev --studio      # also launch Drizzle Studio
stack deploy            # generate and apply migrations
stack db reset          # drop and recreate the local database
```

See [`@fcalell/cli`](packages/cli/README.md) for the full command reference.

## Packages

| Package | Purpose | Docs |
|---------|---------|------|
| `@fcalell/cli` | `stack` CLI: project scaffolding, dev orchestration, deploy | [packages/cli](packages/cli/README.md) |
| `@fcalell/config` | Unified `stack.config.ts` via `defineConfig()` | [packages/config](packages/config/README.md) |
| `@fcalell/db` | Drizzle clients for D1/SQLite, Better Auth integration, access control | [packages/db](packages/db/README.md) |
| `@fcalell/api` | API framework: procedure builder, middleware, typed client | [packages/api](packages/api/README.md) |
| `@fcalell/ui` | SolidJS design system (Kobalte + Tailwind v4 + CVA) | [packages/ui](packages/ui/README.md) |
| `@fcalell/vite` | Vite preset: SolidJS, Tailwind v4, API proxy, file-based routing, theme/font FOUC prevention | [packages/vite](packages/vite/README.md) |
| `@fcalell/typescript-config` | Shared `tsconfig` presets | [packages/typescript-config](packages/typescript-config/README.md) |
| `@fcalell/biome-config` | Shared Biome formatter and linter config | [packages/biome-config](packages/biome-config/README.md) |

### Dependency graph

```
config ──> db
api    ──> config, db
cli    ──> config, db
vite      (standalone, used internally by cli)
ui        (standalone)
```

`db` and `ui` are leaf packages with no `@fcalell/*` dependencies. Every package can be consumed independently — use just the UI, just the database, or the full stack.

## Architecture

A consumer project has one config file and one runtime entry point.

**`stack.config.ts`** is the static source of truth. It declares what the project *is* — database dialect, schema, auth policy, RBAC statements, CORS origins, dev options. The CLI and type system both read from it.

**`defineApp()`** is the runtime entry point in the worker. It receives the config and only adds runtime concerns — environment bindings, secrets, email callbacks. See [`@fcalell/api`](packages/api/README.md) for the full surface.

The rule: if the CLI or type system needs it, it goes in `stack.config.ts`. If it requires a live environment, it stays in `defineApp()`.

## Consumer project structure

```
my-app/
  package.json             # imports: { "#/*": "./src/*" } — alias for app + worker
  tsconfig.json            # extends @fcalell/typescript-config
  biome.json               # extends @fcalell/biome-config
  vite.config.ts           # defineConfig() from @fcalell/vite (3 lines)
  stack.config.ts          # defineConfig() — single source of truth
  wrangler.toml
  src/
    schema/                # Drizzle tables
    migrations/            # generated
    worker/
      index.ts             # defineApp() — runtime wiring
      routes/              # procedures
    app/
      entry.tsx            # one line: createApp() from @fcalell/ui/app
      app.css              # theme token overrides
      lib/api.ts           # createClient<AppRouter>()
      pages/               # file-based routes (index.tsx, _layout.tsx, [id].tsx, ...)
```

Routes under `src/app/pages/` are picked up automatically by the file-based routing plugin in `@fcalell/vite` and consumed by `createApp()`. See [`@fcalell/vite`](packages/vite/README.md#file-based-routing) for the naming conventions.

## Repository commands

```bash
pnpm check     # type-check all packages and run Biome
pnpm lint      # Biome with --write --unsafe
pnpm clear     # remove node_modules and turbo caches
```

## License

MIT
