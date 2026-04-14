# @fcalell/stack

Full-stack framework for SolidJS + Hono + Cloudflare. Ships everything a consumer needs to build and deploy a production app — database, API, UI, tooling — so they only write business logic.

## Philosophy

**The consumer never touches underlying tools.** Each package wraps its domain (Drizzle, Hono, oRPC, Kobalte, Vite, Tailwind) and re-exports only what's needed. Consumers don't install or import `drizzle-orm`, `hono`, `zod`, `@kobalte/core`, `vite`, or `tailwindcss` directly — the stack handles it.

**Everything is opt-in and composable.** A project can use just the UI, just the database, or the full stack. The CLI scaffolds what you pick and detects what's configured.

**Single config, single entry point.** `stack.config.ts` is the single source of truth for the project — database, auth policy, API settings, dev options. `defineApp()` is the single entry point for the API runtime — it receives the config and only adds runtime concerns (secrets, bindings, callbacks). The `stack` CLI is one command for init, dev, and deploy.

## Packages

| Package | Purpose | Docs |
|---------|---------|------|
| `@fcalell/config` | Unified `stack.config.ts` — `defineConfig()` | @packages/config/README.md |
| `@fcalell/cli` | `stack` CLI: project scaffolding, dev orchestration, deploy | @packages/cli/README.md |
| `@fcalell/vite` | Vite preset: SolidJS + Tailwind v4 + API proxy (internal, CLI-managed) | @packages/vite/README.md |
| `@fcalell/db` | Drizzle ORM clients (D1/SQLite), Better Auth integration | @packages/db/README.md |
| `@fcalell/api` | API framework: procedure builder, auth/RBAC middleware, typed client | @packages/api/README.md |
| `@fcalell/ui` | Design system: SolidJS + Kobalte + Tailwind v4 + CVA | @packages/ui/README.md, component docs in `packages/ui/docs/*.md` |
| `@fcalell/typescript-config` | tsconfig presets (base, solid-vite, node-tsx) | @packages/typescript-config/README.md |
| `@fcalell/biome-config` | Shareable Biome formatter/linter config | @packages/biome-config/README.md |

### Dependency graph

```
config ──> db
api    ──> config, db
cli    ──> config, db
vite      (standalone, used internally by cli)
ui        (standalone)
```

`db` and `ui` have no `@fcalell/*` dependencies — they are leaf packages. `config` depends on `db` for auth and database types. `api` and `cli` depend on `config` for the unified config type and on `db` for runtime clients and tooling. `vite` and `ui` are fully independent.

## CLI: `stack`

The `stack` CLI lives in `@fcalell/cli`. It scaffolds consumer projects, runs dev workflows, and deploys.

```bash
stack init [dir]                 # Interactive project scaffold (pick db, api, app)
stack add <db|auth|org|api|ui>   # Add a feature to an existing project
stack dev [--studio]             # Context-aware dev (schema watch, Drizzle Studio)
stack deploy                     # Context-aware deploy (migrations)
stack db reset                   # Reset local database
```

The CLI reads `stack.config.ts` to determine what's configured (database, auth, organizations) and checks the filesystem for scaffolded layers (worker entry, app entry).

## Consumer project structure

A full-stack consumer project looks like:

```
my-app/
  package.json
  tsconfig.json            # extends @fcalell/typescript-config
  biome.json               # extends @fcalell/biome-config
  stack.config.ts          # defineConfig() — single source of truth
  wrangler.toml
  src/
    schema/                # ← business logic (Drizzle tables)
    migrations/            # ← generated
    worker/
      index.ts             # defineApp() — runtime wiring only
      routes/              # ← business logic (procedures)
    app/
      entry.tsx            # scaffolded once
      app.tsx              # root layout
      app.css              # theme token overrides
      lib/api.ts           # createClient<AppRouter>()
      pages/               # ← business logic (UI)
```

## Config architecture

**Static config** (`stack.config.ts`) — what the project *is*:
- Database: dialect, schema, databaseId
- Auth: cookies, session fields, user fields, organizations, RBAC
- API: CORS origins, RPC prefix
- Dev: studio port

**Runtime config** (`defineApp()`) — how the project *runs*:
- Environment bindings (D1, secrets, rate limiters)
- Auth secrets (`AUTH_SECRET`, `APP_URL`)
- Email callbacks (`sendOTP`, `sendInvitation`)

The rule: if the CLI or type system needs it, it goes in `stack.config.ts`. If it requires a live environment, it stays in `defineApp()`.

## Commands

```bash
pnpm check            # Lint (Biome) + type-check all packages
```

> Coding conventions live in `.claude/rules/`.
