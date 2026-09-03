# Coding conventions

> **Load when:** writing or editing any TypeScript in this repo. Baseline package, placement, and
> style rules. Pair with `plugin-authoring.md` when the change touches a plugin's contract.

## Package conventions

Each package must be small, single-purpose, and independently consumable.

Packages export via subpath exports in package.json, never a barrel index that re-exports
everything.

Use `#` hash imports for internal paths within a package. Use subpath exports for the public API.

All packages use `workspace:*` to depend on sibling `@fcalell/*` packages.

TypeScript configs extend `@fcalell/typescript-config`, never define compiler options directly.

## Where a new feature or config surface belongs

Before adding any option, type, or file, decide who owns the domain. The default answer is **a
plugin, not core**. Full rationale: `.helm/knowledge/product/philosophy.md`.

- **`@fcalell/cli` (core) is domain-agnostic.** Orchestration, slot graph, codegen, `defineConfig`,
  `plugin`, `slot.*`, AST specs. Never add domain types here (`FontEntry`, `AuthProvider`,
  `SchemaTable`, etc.). If you catch yourself importing a domain type into `packages/cli/src/`,
  stop and move it.
- **`AppConfig` / top-level `app`** takes only cross-cutting identity (`name`, `domain`): values
  consumed by more than one plugin. A value that only makes sense to one plugin's domain does
  **not** go on `app`; it goes on that plugin's options. HTML `<head>` metadata (`title`,
  `description`, `icon`, `themeColor`, `lang`) lives on `plugin-solid` because it's meaningless
  without a frontend.
- **Plugin options** are the home for domain config. Typography → `solidUi({ fonts })`. API prefix
  → `api({ prefix })`. Drizzle dialect → `db({ dialect })`. Types for those options live in the
  plugin's `src/types.ts`, or alongside the plugin that renders them at build time (e.g.
  `FontEntry` sits in `@fcalell/plugin-solid-ui/node/fonts` because `themeFontsPlugin` consumes
  it).
- **Runtime data types** (e.g. `FontEntry`, design tokens) belong to the plugin that renders or
  emits them at build time; downstream plugins import via its subpath export and re-export from
  their own `types.ts` for consumers.
- **Cross-plugin coordination** goes through the slot graph, never through shared core state. If
  plugin A needs to feed a value into plugin B's codegen, A imports `B.slots.foo` and contributes
  typed payloads. If A needs to read B's value, A declares a derived slot with
  `inputs: { foo: B.slots.foo }`. Plugins never call into each other's internals at runtime.

Quick test: if removing the feature would require changes to `@fcalell/cli`, the feature is in the
wrong place.

## Plugin folder structure

Each plugin lives in `plugins/<name>/` and is published as `@fcalell/plugin-<name>`.

```
plugins/<name>/
  src/
    index.ts              ← plugin() result (main export ".")
    types.ts              ← shared option types
    node/                 ← Node.js only — codegen aggregators, CLI helpers
    worker/               ← Cloudflare Workers only — runtime (exported as "./runtime")
  templates/              ← lintable on-disk templates (scaffolded by ScaffoldSpec contributions)
```

`worker/` files never import from `node/`. `node/` files never import from `worker/`.

A plugin whose runtime is a consumer-run Node server (plugin-node) splits the same way with
`server/` (Node runtime, exported as `./server`), `client/` (browser code), and `ws/` (isomorphic
shared contract): `node/` (codegen) and `server/` never import each other, and `client/` and
`server/` share only `ws/`.

Runtime plugin (if any) is exported from the `./runtime` subpath. The CLI discovers it by checking
`package.json` exports. Runtime factories take plain options, not `PluginConfig`.

Config factory function name matches plugin name: `db()`, `auth()`, `api()`, `solid()`,
`solidUi()`.

Third-party plugins published outside the `@fcalell/plugin-*` namespace must pass an explicit
`package` option; first-party plugins omit it and fall back to the `@fcalell/plugin-${name}`
default.

## Code style

Only comment non-obvious code; never use JSDoc.

Keep exports minimal: only expose what consumers actually need.

Prefer factory functions over classes for configuration (e.g. `createAuthClient()` not
`new AuthClient()`).
