# Slot catalog & spec types

The registry of every first-party slot and the payload shapes they carry. Use these as both
contribution targets and derivation inputs. Semantics of the four slot kinds:
[slot-graph](./slot-graph.md). Keep this file current: a plugin adding, renaming, or removing a
slot updates its table here in the same commit.

## CLI lifecycle slots — `cliSlots` from `@fcalell/cli/cli-slots`

The cross-cutting sinks every command consumes. Plugins contribute here for files, processes, and
lifecycle hooks; rarely read from these.

| Slot | Kind | Purpose |
|------|------|---------|
| `cliSlots.initPrompts` | `list<PromptSpec>` | Init/add interactive prompts |
| `cliSlots.initScaffolds` | `list<ScaffoldSpec>` | Templates copied once into the consumer repo |
| `cliSlots.initDeps` | `map<string, string>` | npm `dependencies` to add (auto-wired from `plugin({ dependencies })`) |
| `cliSlots.initDevDeps` | `map<string, string>` | npm `devDependencies` to add (auto-wired from `plugin({ devDependencies })`) |
| `cliSlots.packageJsonFields` | `map<unknown>` | Top-level `package.json` fields (e.g. Expo's `main`). Written if-absent at init/add, never clobbers a consumer-set value; duplicate keys across plugins throw |
| `cliSlots.gitignore` | `list<string>` | `.gitignore` entries (auto-wired from `plugin({ gitignore })`) |
| `cliSlots.artifactFiles` | `list<GeneratedFile>` | `{ path, content }` files written under `.stack/` (or anywhere in cwd) |
| `cliSlots.postWrite` | `list<() => Promise<void>>` | Hooks to run after artifact files land (e.g. `wrangler types`) |
| `cliSlots.devProcesses` | `list<ProcessSpec>` | Long-running dev processes spawned in parallel |
| `cliSlots.devWatchers` | `list<WatcherSpec>` | chokidar watchers attached during `stack dev` |
| `cliSlots.devReadySetup` | `list<DevReadyTask>` | One-shot tasks run after processes report ready |
| `cliSlots.buildSteps` | `list<BuildStep>` | Phase-sorted (`pre`/`main`/`post`) build steps |
| `cliSlots.deployChecks` | `list<DeployCheck>` | Pre-deploy checks displayed and confirmed |
| `cliSlots.deploySteps` | `list<DeployStep>` | Phase-sorted deploy steps |
| `cliSlots.removeFiles` | `list<string>` | Paths removed on `stack remove <plugin>` |
| `cliSlots.removeDeps` | `list<string>` | npm deps removed (auto-wired from `plugin({ dependencies })`) |
| `cliSlots.removeDevDeps` | `list<string>` | npm devDeps removed (auto-wired from `plugin({ devDependencies })`) |
| `cliSlots.tsconfigPaths` | `map<string, string[]>` | Consumer tsconfig `compilerOptions.paths` entries (e.g. api's `virtual:stack-procedure` alias). Read once by `stack init`'s tsconfig template, never by `stack generate` |
| `cliSlots.tsconfigTypes` | `list<string>` | Consumer tsconfig `compilerOptions.types` entries (e.g. native-ui's `uniwind/types`). Same consumption point as `tsconfigPaths` |

For the universal "resolve a `*Source` slot, write it under `.stack/`, skip on `null`" pattern,
prefer the `emitArtifact` helper exported alongside `cliSlots`:

```ts
import { emitArtifact } from "@fcalell/cli/cli-slots";

contributes: (self) => [
  emitArtifact(".stack/worker.ts", self.slots.workerSource),
],
```

It expands to a `cliSlots.artifactFiles.contribute` that resolves the source slot, returns
`{ path, content }`, or skips when the source resolves to `null`. Drop down to the raw
`cliSlots.artifactFiles.contribute(...)` form only when the contribution needs more than that,
e.g. consulting `ctx.fileExists` before writing.

## `api.slots.*` (plugin-api)

| Slot | Kind | Purpose |
|------|------|---------|
| `workerImports` | `list<TsImportSpec>` | Imports for `.stack/worker.ts` |
| `pluginRuntimes` | `list<PluginRuntimeEntry>` | Runtime entries that become `.use(xRuntime({...}))` calls |
| `middlewareEntries` | `list<MiddlewareSpec>` | Hono middleware (phase-ordered) |
| `middlewareCalls` | `derived<TsExpression[]>` | Sorted call expressions derived from `middlewareEntries` |
| `middlewareImports` | `derived<TsImportSpec[]>` | Deduplicated imports for middleware |
| `routesHandler` | `value<{ identifier } \| null>` | Routes namespace identifier (seeded from `src/worker/routes` existence) |
| `corsOrigins` | `list<string>` | Extra CORS origins (frontend plugins push localhost here) |
| `routePrefixes` | `list<string>` | URL prefixes the worker owns (api contributes its `prefix`); deploy targets read this to mount/forward worker paths |
| `cors` | `derived<string[]>` | Final CORS list — `app.origins` verbatim, or `[https://domain, https://app.domain, ...corsOrigins]` |
| `callbacks` | `map<string, CallbackSpec>` | Plugin-name → callback identifier; spliced onto matching runtime's options |
| `workerBase` | `derived<TsExpression>` | The `createWorker({...})` call expression |
| `workerSource` | `derived<string \| null>` | Final `.stack/worker.ts` source; null when neither runtimes nor routes are present |
| `rbacStatements` | `value<Record<string, readonly string[]> \| null>` (`override`) | RBAC action statements for `procedure({ rbac })`'s type-level autocomplete; `auth` contributes from `organization.ac.statements` |
| `procedureSource` | `derived<string \| null>` | Final `.stack/procedure.ts` source (`virtual:stack-procedure`'s target); rebuilds the same runtime + middleware `.use()` chain as `workerSource` so `WorkerContext` matches the real request context; null when neither runtimes nor routes are present |

## `cloudflare.slots.*` (plugin-cloudflare)

| Slot | Kind | Purpose |
|------|------|---------|
| `bindings` | `list<WranglerBindingSpec>` | D1 / KV / R2 / rate_limiter / var bindings |
| `routes` | `list<WranglerRouteSpec>` | Worker route patterns |
| `vars` | `map<string, string>` | Plain-text `[vars]` |
| `secrets` | `list<{ name, devDefault }>` | `.dev.vars` template entries |
| `compatibilityDate` | `value<string>` | Defaults to today; override with `value` + `override:true` |
| `compatibilityFlags` | `list<string>` | Wrangler `compatibility_flags`; deduped + sorted, omitted when empty (e.g. auth contributes `nodejs_compat`) |
| `wranglerToml` | `derived<string>` | Final `.stack/wrangler.toml` source (also triggers `wrangler types` via `postWrite`) |

## `node.slots.*` (plugin-node)

| Slot | Kind | Purpose |
|------|------|---------|
| `serverPort` | `value<number>` | Node server port (defaults to options.port ?? 8788) |
| `services` | `list<ServiceEntry>` (`uniqueBy: name`) | Codegen entries (`{ name, imports, expression }`) for the generated server's `services` array; each expression evaluates to a ServiceSpec or ServiceSpec[]; the consumer barrel lands here as one entry |
| `consumerServices` | `value<{ identifier } \| null>` | Consumer services barrel identifier (seeded from `src/server/services` contents) |
| `serviceBarrelSource` | `derived<string \| null>` | Rendered `src/server/services/index.ts` barrel; null when no service modules exist |
| `serverSource` | `derived<string \| null>` | Final `.stack/server.ts` source; reads `api.slots.workerSource` + `routePrefixes`; null when there is no worker and no services |

## `vite.slots.*` (plugin-vite)

| Slot | Kind | Purpose |
|------|------|---------|
| `configImports` | `list<TsImportSpec>` | Imports for `.stack/vite.config.ts` |
| `pluginCalls` | `list<TsExpression>` | Vite plugin call expressions |
| `resolveAliases` | `list<{ find, replacement }>` | `resolve.alias` entries |
| `devServerPort` | `value<number>` | Dev server port (defaults to options.port ?? 3000) |
| `serverProxy` | `list<ServerProxyEntry>` (`uniqueBy: path`) | Dev-server proxy rules (`{ path, target, ws? }`) rendered into `server.proxy`; deploy targets contribute worker-owned paths so dev stays same-origin like prod |
| `viteConfig` | `derived<string \| null>` | Final `.stack/vite.config.ts` source; null when nothing to emit |

## `solid.slots.*` (plugin-solid)

| Slot | Kind | Purpose |
|------|------|---------|
| `providers` | `list<ProviderSpec>` | JSX wrappers / siblings for `.stack/virtual-providers.tsx` (sorted by `order`) |
| `entryImports` | `list<TsImportSpec>` | Imports for `.stack/entry.tsx` |
| `mountExpression` | `value<TsExpression \| null>` | Root render call (override-able for custom mount) |
| `htmlShell` | `value<URL \| null>` | HTML shell template URL |
| `htmlHead` | `list<HtmlInjection>` | `<head>` injections (title, meta, link, script, html-attr) |
| `htmlBodyEnd` | `list<HtmlInjection>` | End-of-body injections |
| `routesPagesDir` | `derived<string \| null>` | Resolved pages directory or null when routing disabled |
| `entrySource` | `derived<string \| null>` | Final `.stack/entry.tsx` |
| `htmlSource` | `derived<string \| null>` | Final `.stack/index.html` |
| `providersSource` | `derived<string \| null>` | Final `.stack/virtual-providers.tsx` |
| `routesDtsSource` | `derived<string \| null>` | Final `.stack/routes.d.ts` |
| `homeScaffold` | `value<ScaffoldSpec>` (`override`) | Scaffold for `src/app/pages/index.tsx`; solid-ui overrides with the design-system home |

## `solidUi.slots.*` (plugin-solid-ui)

| Slot | Kind | Purpose |
|------|------|---------|
| `appCssImports` | `list<string>` | CSS `@import`s aggregated into `.stack/app.css` |
| `appCssLayers` | `list<{ name, content }>` | CSS `@layer` blocks |
| `fonts` | `derived<FontEntry[]>` | Resolved fonts (consumer options or `defaultFonts`) |
| `appCssSource` | `derived<string \| null>` | Final `.stack/app.css`; null when nothing landed |

## `auth.slots.*` (plugin-auth)

| Slot | Kind | Purpose |
|------|------|---------|
| `runtimeOptions` | `derived<Record<string, TsExpression>>` | Better Auth runtime options; reads `api.slots.cors` to derive `trustedOrigins` + `sameSite` |

## Spec types

The shapes carried by slot payloads. All exported from `@fcalell/cli/ast` (TS / TOML / HTML specs)
or `@fcalell/cli/specs` (lifecycle specs).

- `ScaffoldSpec`: `{ source: URL; target: string; plugin: string }`. Used for templates copied into
  the consumer repo. Build with `ctx.scaffold(name, target)`.
- `TsImportSpec`: four shapes:
  ```ts
  { source: "@fcalell/plugin-db/runtime", default: "dbRuntime" }
  { source: "@cloudflare/workers-types", named: ["D1Database"], typeOnly: true }
  { source: "../src/schema", namespace: "schema" }
  { source: "tailwindcss", sideEffect: true }
  ```
- `TsExpression`: structured AST node (`call`, `identifier`, `string`, `array`, `object`, `jsx`,
  `arrow`, `member`, `as`, …). Pattern:
  ```ts
  // dbRuntime({ binding: "DB_MAIN", schema })
  {
    kind: "call",
    callee: { kind: "identifier", name: "dbRuntime" },
    args: [{
      kind: "object",
      properties: [
        { key: "binding", value: { kind: "string", value: "DB_MAIN" } },
        { key: "schema",  value: { kind: "identifier", name: "schema" }, shorthand: true },
      ],
    }],
  }

  // <Toaster />
  { kind: "jsx", tag: "Toaster", props: [], children: [] }
  ```
- `WranglerBindingSpec`: `d1` / `kv` / `r2` / `rate_limiter` / `var` shapes. Aggregator catches
  duplicate `binding` names and fails fast.
- `HtmlInjection`: `title` / `meta` / `link` / `script` / `html-attr`.
- `ProviderSpec`: `{ imports, wrap?, siblings?, order }` for JSX provider composition.
- `MiddlewareSpec`: `{ imports, call, phase: "before-cors" | "after-cors" | "before-routes" | "after-routes", order }`.
- `PluginRuntimeEntry`: `{ plugin, import, identifier, options? }` describing a `.use(xRuntime(opts))` call.
- `ProcessSpec`, `WatcherSpec`, `BuildStep`, `DeployStep`, `DeployCheck`, `PromptSpec`,
  `DevReadyTask`, `GeneratedFile`: exported from `@fcalell/cli/specs`. `ProcessSpec.env` merges
  extra environment variables over the parent env at spawn (per-process dev signals like
  `STACK_DEV=1` on targets without `.dev.vars`).
