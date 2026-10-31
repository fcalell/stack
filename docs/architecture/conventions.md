# Coding conventions

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
`"build": "tsc -p tsconfig.build.json"` and `"prepare": "pnpm build"`, which builds a checkout's
install (a `link:` or git one; a published package ships `dist` already); `files` lists `dist` and `src` (and the
`guide`, `templates` or `lint` a package ships, never a test or a `tsconfig`); `clear` removes `dist`. How the
packages are versioned, which peers a stack package may state and the publish order: `releasing.md`.

Each `exports` entry a bundler compiles (`.tsx`, `.css`, anything under `src/ui/`, the
`./components/*` and `./lib/*` patterns) points at source; every other entry is
`{ "types": "./dist/<path>.d.ts", "default": "./dist/<path>.js" }`. A source entry reaches a
sibling module that also ships compiled through the package's own name, never a relative path,
or the bundle holds two copies of that module. An entry's target is one string, never an array: a
bundler takes an array's first target whether or not the file exists, where tsc tries each, so an
array type-checks and fails the consumer's build. A pattern names one extension
(`"./lib/*": "./src/ui/lib/*.ts"`) and each module of the other extension gets its own entry
(`"./lib/words": "./src/ui/lib/words.tsx"`).
Vite's dev optimizer skips a `.tsx` entry unless told otherwise, so plugin-vite's generated config
adds `.tsx` to `optimizeDeps.extensions`.

A sibling `@fcalell/*` import resolves through its `exports`, so type-checking needs the
dependencies' `dist`: turbo runs `^build` before `check-types`, and the package's own
`build` before its `check-types` (a source entry's self-name import). Root `pnpm check` is
`turbo run check-types`, then `biome check` (read-only; `pnpm lint` writes the fixes). The
apps' `check-types` depends on their `generate` (the `.stack/` files), not their
`build`, so the gate never runs a production bundle; `pnpm build` does.

## Where a new feature or config surface belongs

Before adding any option, type, or file, decide who owns the domain. The default answer is **a
plugin, not core**. Full rationale: `docs/product.md`.

- **`@fcalell/cli` (core) is domain-agnostic.** Orchestration, slot graph, codegen, `defineConfig`,
  `plugin`, `slot.*`, AST specs. Never add domain types here (`FontEntry`, `AuthProvider`,
  `SchemaTable`, etc.). If you catch yourself importing a domain type into `packages/cli/src/`,
  stop and move it.
- **`AppConfig` / top-level `app`** takes only cross-cutting identity (`name`, `domain`): values
  consumed by more than one plugin. A value that only makes sense to one plugin's domain does
  **not** go on `app`; it goes on that plugin's options. HTML `<head>` metadata (`title`,
  `description`, `icon`, `themeColor`, `lang`) lives on `plugin-react` because it's meaningless
  without a web app; the deep-link scheme lives on `plugin-expo` because it's meaningless without
  a native app.
- **Plugin options** are the home for domain config. Typography → `reactUi({ fonts })`. API
  prefix → `api({ prefix })`. Drizzle dialect → `db({ dialect })`. Types for those options live in
  the plugin's `src/types.ts`, or alongside the plugin that renders them at build time.
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

Config factory function name matches plugin name: `db()`, `auth()`, `api()`, `react()`,
`expo()`, `nativeUi()`.

Third-party plugins published outside the `@fcalell/plugin-*` namespace must pass an explicit
`package` option; first-party plugins omit it and fall back to the `@fcalell/plugin-${name}`
default.
