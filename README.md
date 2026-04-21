# @fcalell/stack

A plugin-driven full-stack framework for SolidJS, Hono, and Cloudflare Workers. The stack ships database, API, UI, and tooling behind a single `stack` CLI so a project only contains business logic.

## What you get

- **Database** — Drizzle ORM for Cloudflare D1 and SQLite (`@fcalell/plugin-db`).
- **Auth** — Better Auth integration, RBAC, access control (`@fcalell/plugin-auth`).
- **API** — Hono + oRPC behind a procedure builder with auth, rate limiting, and a typed client (`@fcalell/plugin-api`).
- **UI** — SolidJS + Kobalte + Tailwind v4 + CVA design system (`@fcalell/plugin-solid`, `@fcalell/plugin-solid-ui`).
- **Tooling** — One `stack` CLI for init, dev, build, deploy. TypeScript and Biome presets included.

Consumers never install or import `drizzle-orm`, `hono`, `zod`, `@kobalte/core`, `vite`, or `tailwindcss` directly. Plugins wrap their domain and re-export only what is needed.

## Quick start

```bash
pnpm add -D @fcalell/cli
pnpm exec stack init my-app
```

`stack init` prompts for plugins and plugin-specific options, scaffolds the project, and generates `.stack/`. From inside the project:

```bash
stack dev               # plugin-driven dev (processes, watchers, schema push)
stack dev --studio      # also launch Drizzle Studio
stack build             # plugin-driven production build
stack deploy            # migrations + wrangler
stack db push           # plugin subcommands: stack <plugin> <command>
```

## Consumer example

A minimal `stack.config.ts` is the single source of truth — a `domain`, a `plugins` array, and optional dev settings.

```ts
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
    db({ dialect: "d1", databaseId: "9a619a0b-..." }),
    auth({ cookies: { prefix: "myapp" }, organization: true }),
    api(),
    vite(),
    solid(),
    solidUi(),
  ],
});
```

Plugins declare ordering via typed event tokens (`after: [db.events.SchemaReady]`). The CLI resolves them automatically, so the order above does not matter. Every plugin must be listed explicitly; `stack init` auto-adds missing dependencies (e.g. picking `solid` also adds `vite`).

## CLI commands

| Command | Purpose |
|---------|---------|
| `stack init [dir]` | Interactive project scaffold (pick plugins) |
| `stack add <plugin>` | Add a plugin to an existing project |
| `stack remove <plugin>` | Remove a plugin (checks dependents) |
| `stack generate` | Regenerate `.stack/` files from config |
| `stack dev [--studio]` | Plugin-driven dev |
| `stack build` | Plugin-driven production build |
| `stack deploy` | Plugin-driven deploy |
| `stack <plugin> <command>` | Plugin-registered subcommand (e.g. `stack db push`) |
| `stack plugin init <name>` | Scaffold a third-party plugin skeleton |

## Packages

| Package | Purpose |
|---------|---------|
| [`@fcalell/cli`](packages/cli) | `defineConfig()`, `createPlugin()`, `stack` CLI, event bus, codegen |
| [`@fcalell/typescript-config`](packages/typescript-config) | Shared `tsconfig` presets |
| [`@fcalell/biome-config`](packages/biome-config) | Shared Biome formatter and linter config |

## Plugins

| Plugin | Purpose | Factory |
|--------|---------|---------|
| [`@fcalell/plugin-db`](plugins/db) | Drizzle ORM clients (D1/SQLite), schema tooling, migrations | `db()` |
| [`@fcalell/plugin-auth`](plugins/auth) | Better Auth integration, RBAC, access control | `auth()` |
| [`@fcalell/plugin-api`](plugins/api) | Hono + oRPC, procedure builder, typed client | `api()` |
| [`@fcalell/plugin-vite`](plugins/vite) | Framework-agnostic Vite lifecycle | `vite()` |
| [`@fcalell/plugin-solid`](plugins/solid) | SolidJS compilation, file-based routing, app bootstrap | `solid()` |
| [`@fcalell/plugin-solid-ui`](plugins/solid-ui) | SolidJS design system — Kobalte + Tailwind v4 + CVA components, fonts, typography tokens | `solidUi()` |

See each plugin's README for config options, commands, event handlers, and runtime exports.

## Writing a plugin

Third-party plugins are first-class. Scaffold one with:

```bash
pnpm exec stack plugin init my-plugin
pnpm exec stack plugin init my-plugin --package @acme/stack-plugin-foo --dir ./packages/my-plugin
```

The scaffold produces a `createPlugin()`-based skeleton, a vitest test wired to `@fcalell/cli/testing`, and a runtime stub exported from `./runtime`. Publish it under any npm name — consumers add it to `stack.config.ts` like any built-in plugin.

## Repository commands

```bash
pnpm check            # Lint (Biome) + type-check all packages
pnpm test             # Run all tests once (vitest run)
pnpm test:watch       # Run tests in watch mode
```

## Architecture

See [`CLAUDE.md`](CLAUDE.md) for the full architecture, lifecycle events, dependency graph, and generated-file layout. Coding conventions live in [`.claude/rules/conventions.md`](.claude/rules/conventions.md).

## License

MIT
