## Package conventions

Each package must be small, single-purpose, and independently consumable.

Packages export via subpath exports in package.json — never a barrel index that re-exports everything.

Use `#` hash imports for internal paths within a package. Use subpath exports for the public API.

All packages use `workspace:*` to depend on sibling `@fcalell/*` packages.

TypeScript configs extend `@fcalell/typescript-config` — never define compiler options directly.

## Where a new feature or config surface belongs

Before adding any option, type, or file, decide who owns the domain. The default answer is **a plugin, not core**.

- **`@fcalell/cli` (core) is domain-agnostic.** Orchestration, slot graph, codegen, `defineConfig`, `plugin`, `slot.*`, AST specs. Never add domain types here (`FontEntry`, `AuthProvider`, `SchemaTable`, etc.). If you catch yourself importing a domain type into `packages/cli/src/`, stop and move it.
- **`AppConfig` / top-level `app`** takes only cross-cutting identity (`name`, `domain`) — values consumed by more than one plugin. A value that only makes sense to one plugin's domain does **not** go on `app` — it goes on that plugin's options. HTML `<head>` metadata (`title`, `description`, `icon`, `themeColor`, `lang`) lives on `plugin-solid` because it's meaningless without a frontend.
- **Plugin options** are the home for domain config. Typography → `solidUi({ fonts })`. API prefix → `api({ prefix })`. Drizzle dialect → `db({ dialect })`. Types for those options live in the plugin's `src/types.ts`, or alongside the plugin that renders them at build time (e.g. `FontEntry` sits in `@fcalell/plugin-solid-ui/node/fonts` because `themeFontsPlugin` consumes it).
- **Runtime data types** (e.g. `FontEntry`, design tokens) belong to the plugin that renders or emits them at build time — downstream plugins import via its subpath export and re-export from their own `types.ts` for consumers.
- **Cross-plugin coordination** goes through the slot graph, never through shared core state. If plugin A needs to feed a value into plugin B's codegen, A imports `B.slots.foo` and contributes typed payloads. If A needs to read B's value, A declares a derived slot with `inputs: { foo: B.slots.foo }`. Plugins never call into each other's internals at runtime.

Quick test: if removing the feature would require changes to `@fcalell/cli`, the feature is in the wrong place.

## Plugin conventions

Each plugin lives in `plugins/<name>/` and is published as `@fcalell/plugin-<name>`.

Plugins are built with `plugin()` from `@fcalell/cli`. The result is both a callable config factory and a plugin descriptor:

```ts
import { plugin } from "@fcalell/cli";
export const db = plugin("db", { label: "Database", schema: dbOptionsSchema, /* ... */ });
```

Config factory function name matches plugin name: `db()`, `auth()`, `api()`, `solid()`, `solidUi()`.

Cross-plugin dataflow is expressed as typed slot imports: `cloudflare.slots.bindings.contribute(fn)` to push a value, `slot.derived({ inputs: { cors: api.slots.cors }, compute })` to read one. The framework derives ordering from these edges; there is no `after:` field and no plugin firing order to think about.

`requires: ["plugin"]` declares presence-only sibling-plugin names — used for nicer error messages when a sibling is missing from the consumer's config. It does NOT influence ordering.

Every plugin a consumer depends on must be listed explicitly in `stack.config.ts`. There is no implicit-resolution layer: if `plugin-solid` requires `plugin-vite`, the consumer adds `vite()` alongside `solid()`. Validation surfaces the missing plugin with an actionable error.

Third-party plugins published outside the `@fcalell/plugin-*` namespace must pass an explicit `package` option:

```ts
export const widget = plugin("widget", {
  label: "Widget",
  package: "@acme/stack-plugin-widget",
  contributes: [],
});
```

The CLI stamps this onto every `PluginConfig` as `__package` and uses it for dynamic `import()` at discovery time. First-party plugins omit the field and fall back to the `@fcalell/plugin-${name}` default.

### Plugin folder structure

```
plugins/<name>/
  src/
    index.ts              ← plugin() result (main export ".")
    index.test.ts
    types.ts              ← shared option types
    node/                 ← Node.js only — codegen aggregators, CLI helpers
    worker/               ← Cloudflare Workers only — runtime (exported as "./runtime")
  templates/              ← lintable on-disk templates (scaffolded by ScaffoldSpec contributions)
```

`worker/` files never import from `node/`. `node/` files never import from `worker/`.

Runtime plugin (if any) is exported from `./runtime` subpath. The CLI discovers it by checking `package.json` exports. Runtime factories take plain options, not `PluginConfig`.

### Plugin commands

Plugins register subcommands via the `commands` field on `plugin()`. The CLI auto-routes `stack <plugin> <command>`. Each command handler receives a `CommandContext` with `options`, `cwd`, `log`, `prompt`, and `resolve(slot)` for pulling slot values.

### Plugin callbacks

Plugins declare typed callbacks via `callbacks: { sendOTP: callback<{ email: string; code: string }>() }`. The `plugin()` result auto-exposes `auth.defineCallbacks(impl)` for consumer callback files when at least one callback is declared. When a plugin has both `callbacks` and a `./runtime` subpath export, the framework auto-scaffolds `src/worker/plugins/<name>.ts` from a `templates/callbacks.ts` template (declared via `cliSlots.initScaffolds`).

### Plugin tests

Co-located as `*.test.ts` next to source files. Two patterns, both real-graph driven:

```ts
import { buildTestGraphFromPlugins } from "@fcalell/cli/testing";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "./index";

it("contributes a d1 binding", async () => {
  const { graph } = buildTestGraphFromPlugins({
    plugins: [
      { factory: cloudflare, options: {} },
      { factory: db, options: { dialect: "d1", databaseId: "abc", binding: "DB_MAIN" } },
    ],
  });

  const bindings = await graph.resolve(cloudflare.slots.bindings);

  expect(bindings).toContainEqual(
    expect.objectContaining({ kind: "d1", binding: "DB_MAIN", databaseId: "abc" }),
  );
});
```

For full-pipeline assertions, drive `runStackGenerate({ config })` from `@fcalell/cli/testing` against a `defineConfig({...})` fixture and assert on the produced files. Reordering `config.plugins` in any test must leave it green — the slot graph resolves ordering from data dependencies.

`createMockCtx` is available for the rare unit test that needs a stub `ContributionCtx`, but prefer real graphs whenever possible — a mock ctx with no `resolve` is a bug magnet for any contribution that crosses slots.

## Code style

Only comment non-obvious code; never use JSDoc.

Keep exports minimal — only expose what consumers actually need.

Prefer factory functions over classes for configuration (e.g., `createAuthClient()` not `new AuthClient()`).
