# Coding conventions

> **Load when:** writing or editing any TypeScript in this repo. Package and placement rules. Pair with `plugin-authoring.md` when the change touches a plugin's contract.

## Package conventions

Each package must be small, single-purpose, and independently consumable.

Packages export via subpath exports in package.json, never a barrel index that re-exports
everything.

Use subpath exports for the public API. Code Node runs imports its own modules by relative path
with the `.ts` extension: the build rewrites relative specifiers only, so a `#` import would reach
the consumer as a `.ts` path. `#` hash imports stay in bundler-compiled code (`src/ui/`).

All packages use `workspace:*` to depend on sibling `@fcalell/*` packages.

TypeScript configs extend `@fcalell/typescript-config`, never define compiler options directly.

## Build and exports

A package ships JavaScript for everything Node runs, because Node refuses to strip types under
`node_modules`. Its `tsconfig.build.json` extends its own `tsconfig.json` plus
`@fcalell/typescript-config/build.json`, which compiles `src/` to `dist/` under `nodenext` (an
extensionless relative import fails the build) and leaves out `src/ui/` and `.tsx`. Scripts:
`"build": "tsc -p tsconfig.build.json"` and `"prepare": "pnpm build"`, which builds a git-pinned
install; `files` lists `dist` and `src`; `clear` removes `dist`.

Each `exports` entry a bundler compiles (`.tsx`, `.css`, anything under `src/ui/`, the
`./components/*` and `./lib/*` patterns) points at source; every other entry is
`{ "types": "./dist/<path>.d.ts", "default": "./dist/<path>.js" }`. A source entry reaches a
sibling module that also ships compiled through the package's own name, never a relative path,
or the bundle holds two copies of that module.

A sibling `@fcalell/*` import resolves through its `exports`, so type-checking and tests need the
dependencies' `dist`: turbo runs `^build` before `check-types` and `test`, and the package's own
`build` before its `check-types` (a source entry's self-name import). Root `pnpm check` is
`turbo run build check-types test`, then Biome.

## Tests

A package with tests keeps them in `test/*.test.ts`, lists `test` in its tsconfig `include`,
and runs them with `"test": "node --test 'test/**/*.test.ts'"` (node's own glob: node 24 loads a
bare directory argument as a module). Turbo's `test` task depends on `^build`, so a change in a
dependency re-runs its dependents. A package without tests has no script and turbo skips it.

Tests import their own package's `src/` by relative path and run under plain node with type
stripping, so everything they import from it (runtime code and codegen alike) stays erasable-only (no parameter properties, no enums) and names the `.ts` file
of every value import. A test builds the real runtime factories with literal options, as the
generated worker would, and drives `worker.fetch`; it never spawns `stack` or a scratch
consumer. Test support two packages share lives in a private workspace package
(`@fcalell/auth-testing`), never in a relative import across packages.

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
