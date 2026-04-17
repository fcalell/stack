## Package conventions

Each package must be small, single-purpose, and independently consumable.

Packages export via subpath exports in package.json — never a barrel index that re-exports everything.

Use `#` hash imports for internal paths within a package. Use subpath exports for the public API.

All packages use `workspace:*` to depend on sibling `@fcalell/*` packages.

TypeScript configs extend `@fcalell/typescript-config` — never define compiler options directly.

## Plugin conventions

Each plugin lives in `plugins/<name>/` and is published as `@fcalell/plugin-<name>`.

Plugins are built with `createPlugin()` from `@fcalell/cli`. The result is both a callable config factory and a CLI plugin:

```ts
import { createPlugin } from "@fcalell/cli";
export const db = createPlugin("db", { label: "Database", ... });
```

Config factory function name matches plugin name: `db()`, `auth()`, `api()`, `solid()`, `solidUi()`.

Dependencies are typed event tokens: `depends: [db.events.SchemaReady]`. The CLI reads `event.source` to build the dependency graph and enforce presence.

Implicit plugins (like `plugin-vite`) are marked with `implicit: true` in `createPlugin()` and are never listed in consumer configs — they're auto-resolved from dependency chains.

### Plugin folder structure

```
plugins/<name>/
  src/
    index.ts              ← createPlugin result (main export ".")
    index.test.ts
    types.ts              ← shared option types
    node/                 ← Node.js only — CLI operations
    worker/               ← Cloudflare Workers only — runtime (exported as "./runtime")
```

`worker/` files never import from `node/`. `node/` files never import from `worker/`.

Runtime plugin (if any) is exported from `./runtime` subpath. The CLI discovers it by checking `package.json` exports. Runtime factories take plain options, not `PluginConfig`.

### Plugin commands

Plugins register subcommands via the `commands` field on `createPlugin`. The CLI auto-routes `stack <plugin> <command>`.

### Plugin callbacks

Plugins declare typed callbacks via `callbacks: { sendOTP: callback<{ email: string; code: string }>() }`. The `createPlugin` result exposes `auth.defineCallbacks(impl)` for consumer callback files.

### Plugin tests

Co-located as `*.test.ts` next to source files. Use `createEventBus()` from `@fcalell/cli/events` and mock `RegisterContext` from `@fcalell/cli`. Test event handlers by emitting events and asserting on payload mutations.

## Code style

Only comment non-obvious code; never use JSDoc.

Keep exports minimal — only expose what consumers actually need.

Prefer factory functions over classes for configuration (e.g., `createAuthClient()` not `new AuthClient()`).
