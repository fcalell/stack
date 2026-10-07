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
| `cliSlots.initScaffolds` | `list<ScaffoldSpec>` | Files written once into the consumer repo, from a template or composed content |
| `cliSlots.initDeps` | `map<string, string>` | npm `dependencies` to add (auto-wired from `plugin({ dependencies })`) |
| `cliSlots.initDevDeps` | `map<string, string>` | npm `devDependencies` to add (auto-wired from `plugin({ devDependencies })`) |
| `cliSlots.packageJsonFields` | `map<unknown>` | Top-level `package.json` fields (e.g. Expo's `main`). Written if-absent at init/add, never clobbers a consumer-set value; duplicate keys across plugins throw |
| `cliSlots.gitignore` | `list<string>` | `.gitignore` entries (auto-wired from `plugin({ gitignore })`) |
| `cliSlots.guide` | `list<GuideEntry>` (sorted by domain) | The guide's pages, auto-wired from `plugin({ guide })` under the plugin's name and package; the CLI adds its own (`config`, `commands`, `gap`), and react-ui and native-ui each add ui-core's. Rendered by the CLI into `.stack/guide.md`, a page two plugins list written once |
| `cliSlots.artifactFiles` | `list<GeneratedFile>` | `{ path, content }` files written under `.stack/` (or anywhere in cwd) |
| `cliSlots.lintPlugins` | `list<LintPlugin>` (`{ path, includes }`, unique by `path`) | The Biome GritQL rules a package ships for the app's own sources: `path` is the `.grit` file inside the package (`@fcalell/plugin-react-ui/lint/no-img.grit`), `includes` the globs, relative to the app's root, it runs on. Rendered by the CLI into `.stack/biome.json`, written for every app (empty when no plugin contributes), which the app's `biome.json` extends |
| `cliSlots.postWrite` | `list<() => Promise<void>>` | Hooks to run after artifact files land (e.g. `wrangler types`, TanStack Router's route tree) |
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
| `cliSlots.workerTsconfig` | `value<string>` | The consumer tsconfig (root-relative) holding the worker's `paths`: `tsconfig.worker.json` under the split, else `tsconfig.json`. Contributed by the CLI from the layout `stack init`'s template writes; cloudflare passes it to every bundling wrangler command |

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
| `middlewareEntries` | `list<MiddlewareSpec>` | Hono middleware (phase-ordered); the `after-context` phase mounts after the worker injects its plugin context, every other phase before |
| `middlewareCalls` | `derived<MiddlewareCall[]>` | Sorted calls derived from `middlewareEntries`, each with the builder method that mounts it (`use` / `useAfterContext`) |
| `middlewareImports` | `derived<TsImportSpec[]>` | Deduplicated imports for middleware |
| `routesHandler` | `value<{ identifier } \| null>` | Routes namespace identifier (seeded from `src/worker/routes` existence) |
| `mcpAuth` | `value<boolean>` (`override`, seed false) | Whether the worker holds an OAuth provider for MCP clients; auth contributes true under `mcp` (api never imports auth) |
| `mcpMount` | `derived<{ identifier, name } \| null>` | The MCP endpoint's mount: null without `src/worker/mcp.ts`; with it, generate refuses unless `mcpAuth` is true and routable files exist, and when `api({ prefix })` is `/mcp`. `workerSource` passes the file's default export and the app name to `.handler(routes, { mcp, name })`, `routePrefixes` gains `/mcp`, and `procedureSource` leaves the import out (the file types itself against routes that import the procedure entry) |
| `corsOrigins` | `list<string>` | Extra production CORS origins |
| `devCorsOrigins` | `list<string>` (sorted) | Frontend dev origins: each frontend dev server's (vite, metro) localhost when `app.origins` is absent, else the local origins api partitions out of it; emitted with `devTargetOrigins` after it as `createWorker({ devCors })` and honoured only when the worker runs with `STACK_DEV`, so a deploy never trusts localhost |
| `devTargetOrigins` | `list<string>` (sorted) | Deploy-target dev origins: each deploy target's dev process's (node server, wrangler) localhost when `app.origins` is absent; same dev-only gating, always after `devCorsOrigins` in every dev list |
| `routePrefixes` | `list<string>` | URL prefixes the worker owns (api contributes its `prefix` and, with `src/worker/mcp.ts`, `/mcp`; auth its `/api/auth` and, with `mcp`, `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource`); deploy targets read this to mount/forward worker paths, and plugin-expo's version gate walls only paths inside one |
| `nativeScheme` | `value<string \| null>` | The native app's deep-link scheme, a trusted client origin no CORS list can carry; seeded null, contributed by expo (`options.scheme` ?? app-name slug, the scheme its app config registers). Read by auth's `runtimeOptions` and native-ui's `nativeAuthSource`, so the worker's trusted origins and the client match the app config |
| `localOrigins` | `value<"dev" \| "deployed">` | Where the local origins of `app.origins` belong; seeded `dev`, set to `deployed` by a deploy target that is local itself (node bound to loopback) |
| `cors` | `derived<string[]>` | Final production CORS list: `app.origins` minus local origins (kept when `localOrigins` is `deployed`), or `[https://domain, https://app.domain, ...corsOrigins]` |
| `callbacks` | `map<string, CallbackSpec>` | Plugin-name → callback identifier; spliced onto matching runtime's options |
| `env` | `list<EnvSpec>` (`uniqueBy: name`) | Env vars the worker reads: `{ name, devDefault, validate? }`, declared once by the plugin that reads it (auth: `AUTH_SECRET`, `APP_URL`, OAuth client pairs; api: the consumer's own vars from its `env` option). `validate` hints (`minLength` / `url` / `devLocalhost`) feed the worker's once-per-isolate env assertion. Deploy targets render it: cloudflare into `.dev.vars` (each var deploys as a secret, never a `[vars]` entry), node into the dev process env for each var the shell leaves unset. A `devDefault` must satisfy its own hints or a fresh project refuses to serve; a duplicate name is an error |
| `envType` | `value<TsTypeRef \| null>` (`override`) | The type of the worker's `env`, contributed by the deploy target that declares one (cloudflare: the global `Env` from `wrangler types`); seeded `null`, which leaves `env` `unknown` (node contributes nothing) |
| `workerBase` | `derived<TsExpression>` | The `createWorker({...})` call expression; reads `env` to bake `envChecks` (WS6.3 env value assertions) on both deploy targets, and `envType` to bake `createWorker`'s type argument |
| `workerSource` | `derived<string \| null>` | Final `.stack/worker.ts` source; null when neither runtimes nor routes are present |
| `rbacStatements` | `value<Record<string, readonly string[]> \| null>` (`override`) | RBAC action statements for `procedure({ rbac })` / `procedure({ can })`'s type-level autocomplete; `auth` contributes from `organization.ac.statements` |
| `entities` | `list<string>` (sorted, `uniqueBy`) | Entity vocabulary for `procedure({ reads, writes })`'s type-level autocomplete (WS3 cache invalidation) — union across every contributing plugin; `db` contributes the consumer's Drizzle schema export names, `auth` contributes its own runtime-owned table names (`passkey`, the organization tables and the OAuth tables only when enabled), and `api` contributes the consumer's `entities` option (state outside any plugin's tables: a repo, files, a remote) |
| `testingImports` | `list<TsImportSpec>` (sorted by source) | Imports the test entries' option values need (a schema namespace, a constants module), as `workerImports` carries db's `schema`; `db` contributes the `schema` namespace import of `../src/schema/index.ts` on d1 when `src/schema` exists |
| `testingEntries` | `list<PluginRuntimeEntry>` (sorted by plugin) | One entry per plugin with a `./testing` subpath, the `pluginRuntimes` payload: a default import of `@fcalell/plugin-<name>/testing` and its baked literal options, rendered as `.use(xTesting({...}))` on the test entry. A baked path is relative to the consumer root; `db` contributes `dbTesting({ binding, migrations, compatibilityDate, schema })` on d1, the date resolved from `cloudflare.slots.compatibilityDate`; `auth` contributes `authTesting({ cookiePrefix, secretVar, appUrlVar, expiresIn?, roles?, mcp? })`, the prefix resolved from `auth.slots.cookiePrefix`, `roles` the configured role names, baked only with organizations on, and `mcp: true` only with `mcp` |
| `testingSource` | `derived<string \| null>` | Final `.stack/testing.ts` source: `createTestEntry<AppRouter>` over the worker and procedure modules beside it, the api `prefix`, and `STACK_DEV: "1"` plus every `env` entry's `devDefault`, then one `.use()` per `testingEntries` entry; null when `workerSource` is |
| `procedureSource` | `derived<string \| null>` | Final `.stack/procedure.ts` source (`virtual:stack-procedure`'s target); rebuilds the same runtime + middleware `.use()` chain as `workerSource` so `WorkerContext` matches the real request context; null when neither runtimes nor routes are present |

## `cloudflare.slots.*` (plugin-cloudflare)

| Slot | Kind | Purpose |
|------|------|---------|
| `bindings` | `list<WranglerBindingSpec>` | D1 / KV / R2 / analytics_engine / rate_limiter / var bindings; cloudflare itself contributes the api worker's `RATE_LIMITER_RPC` whenever `api.slots.routePrefixes` is non-empty (plugin-api cannot: cloudflare imports api for `env`, and the reverse import would cycle) |
| `routes` | `list<WranglerRouteSpec>` | Worker route patterns |
| `vars` | `map<string, string>` | Plain-text `[vars]` |
| `compatibilityDate` | `value<string>` | Defaults to today; override with `value` + `override:true` |
| `compatibilityFlags` | `list<string>` | Wrangler `compatibility_flags`; deduped + sorted, omitted when empty (e.g. auth contributes `nodejs_compat`) |
| `wranglerToml` | `derived<string>` | Final `.stack/wrangler.toml` source; reads `api.slots.env` so a consumer `[vars]` key naming a declared var fails generate, and `vite.slots.outDir` with `api.slots.routePrefixes` for the framework-managed `[assets]` table (the client build as a single-page app, `run_worker_first` each prefix bare and with `/*`, since `/mcp/*` alone misses `/mcp`; none without vite, and a consumer `[assets]` fails generate). Cloudflare also contributes a `cliSlots.buildSteps` step (`client-headers`, phase `post`, none without vite or with `clientHeaders` empty) that writes `<outDir>/_headers`, one `/*` rule with `vite.slots.clientHeaders`, and fails the build when a `public/_headers` already sits there. Generate's `postWrite` creates the assets directory when missing, which `wrangler dev` refuses to start without, and runs `wrangler types` |

## `node.slots.*` (plugin-node)

| Slot | Kind | Purpose |
|------|------|---------|
| `serverPort` | `value<number>` | Node server port (defaults to options.port ?? 8788) |
| `serverHost` | `value<string \| null>` | The address the server binds (options.host); null binds every interface |
| `services` | `list<ServiceEntry>` (`uniqueBy: name`) | Codegen entries (`{ name, imports, expression }`) for the generated server's `services` array; each expression evaluates to a ServiceSpec or ServiceSpec[]; the consumer barrel lands here as one entry |
| `consumerServices` | `value<{ identifier } \| null>` | Consumer services barrel identifier (seeded from `src/server/services` contents) |
| `serviceBarrelSource` | `derived<string \| null>` | Rendered `src/server/services/index.ts` barrel; null when no service modules exist |
| `serverSource` | `derived<string \| null>` | Final `.stack/server.ts` source; reads `api.slots.workerSource` + `routePrefixes`, and `vite.slots.outDir` as the static root (null mounts no static files or SPA fallback) with `vite.slots.clientHeaders` as the `clientHeaders` the static files and the fallback carry (rendered only with a static root); null when there is no worker and no services |

## `vite.slots.*` (plugin-vite)

| Slot | Kind | Purpose |
|------|------|---------|
| `configImports` | `list<TsImportSpec>` | Imports for `.stack/vite.config.ts` |
| `pluginCalls` | `list<TsExpression>` (sorted by callee name) | Vite plugin call expressions every Vite config of the app runs, the app's own and a host's (Storybook's); a plugin whose Vite plugins must run in a set order contributes them as one array expression (Vite flattens it). A call only the app's own config runs goes to `appPlugins` |
| `appPlugins` | `list<AppPlugin>` (`{ call: TsExpression, imports: TsImportSpec[] }`) | A plugin call only the app's own config runs, with the imports it needs. `viteConfig` is the one reader: it renders these calls ahead of `pluginCalls` and merges their imports into `configImports`, so a host that draws components in its own Vite config reads `pluginCalls` and `configImports` alone and holds none of them, with no name to match. plugin-react contributes the router plugin here (`react.slots.routerPlugin`), which therefore runs ahead of `react()` and every other call. A host that draws routes reads the owning slot instead (`screens.viteConfig` reads `react.slots.routerOptions`) |
| `resolveAliases` | `list<{ find, replacement }>` | `resolve.alias` entries |
| `resolveDedupe` | `list<string>` | Bare specifiers rendered into `resolve.dedupe` (de-duplicated); plugins whose runtime must stay a singleton contribute here so workspace-linked checkouts can't ship a second copy in the production bundle. plugin-react contributes `react` and `react-dom` |
| `devServerPort` | `value<number>` | Dev server port (defaults to options.port ?? 3000) |
| `outDir` | `value<string \| null>` | The client build's output directory relative to the project root (`dist/client`), rendered as the config's `build.outDir`; seeded null and filled by vite's own contribution, so a reader without vite in the config sees null. cloudflare serves it as `[assets]`, node as its static root |
| `serverProxy` | `list<ServerProxyEntry>` (`uniqueBy: path`) | Dev-server proxy rules (`{ path, target, ws? }`) rendered into `server.proxy`; deploy targets contribute worker-owned paths so dev stays same-origin like prod |
| `fsAllow` | `list<TsExpression>` | Extra `server.fs.allow` path expressions; plugins serving assets from their own package contribute their real location so a workspace-linked stack still serves them in dev. Any entry makes the rendered list explicit, prefixed with the consumer's workspace root |
| `watchIgnored` | `list<string>` (sorted) | Globs rendered into `server.watch.ignored`, added to Vite's own defaults; a plugin whose tool writes scratch files under Vite's root contributes their glob so the writes never reach hot-update handling. plugin-cloudflare contributes `**/.wrangler/**` (wrangler's dev bundle in `.stack/.wrangler/tmp/`) |
| `clientHeaders` | `map<string>` | Headers every response of the web client's host carries; vite contributes `Content-Security-Policy: frame-ancestors 'none'` and `X-Frame-Options: DENY`, so no stack app is framed and no option allows it. Three readers: vite renders it into `server.headers` (dev), cloudflare writes it to `<outDir>/_headers` in a `post` build step, node passes it to its static server; resolves `{}` without vite |
| `viteConfig` | `derived<string \| null>` | Final `.stack/vite.config.ts` source; null when nothing to emit |

`@fcalell/plugin-vite/node` exports `renderViteConfig(values: ViteConfigValues)`, the pure renderer `viteConfig` calls. `ViteConfigValues` has one field per slot `viteConfig` hands it, under the slot's own name (the app-only calls already merged into `pluginCalls` and `configImports`), so a host that builds its own graph (`buildGraphFromConfig`, then `graph.resolve(vite.slots.<name>)`) passes the resolved values through, changes the ones it needs (`clientHeaders: {}`, extra `pluginCalls` of its own that never reach the app's config) and renders its own variant.

A path a contribution hands a Vite plugin is an expression anchored on the config file (`fileURLToPath(new URL("../src/app/routes", import.meta.url))`), so it holds when a host moves Vite's `root`, and no absolute path of the machine is written into the config. plugin-react hands TanStack's router plugin `routesDirectory` and `generatedRouteTree` this way. A contribution declares every import its expression uses through `configImports` (`{ source: "node:url", named: ["fileURLToPath"] }` for these paths); the renderer imports only what its own output uses and merges all imports by source, dropping repeated names, so two contributions declaring the same import are one line.

## `react.slots.*` (plugin-react)

| Slot | Kind | Purpose |
|------|------|---------|
| `providers` | `list<ProviderSpec>` | JSX wrappers / siblings for `.stack/virtual-providers.tsx` (sorted by `order`, lower = outer), served as `virtual:stack-providers` |
| `entryImports` | `list<TsImportSpec>` | Extra imports for `.stack/entry.tsx` |
| `routerBindings` | `list<TsImportSpec>` (sorted by source) | A named import of a function that takes the router instance; the default mount calls each as `<name>(router);` right after `createRouter`, before render. The generic seam for a peer that needs the router (react-ui contributes `bindRouter`, its routing module, when routing is on); a peer's own `mountExpression` owns its router and calls none |
| `mountExpression` | `value<Mount \| null>` (`override`) | The root mount: verbatim statements plus their imports. react seeds the TanStack router inside `<StrictMode><Providers>` when routing is on; a peer replaces it for a custom mount. Null skips `entry.tsx` and its script tag |
| `htmlShell` | `value<URL \| null>` (`override`) | HTML shell template URL |
| `htmlHead` | `list<HtmlInjection>` (one `title`, one of each `html-attr`) | `<head>` injections (title, meta, link, script, html-attr); react contributes `lang`, the title (`title` ?? `app.name`), `description`, `themeColor`, `icon` |
| `htmlBodyEnd` | `list<HtmlInjection>` | End-of-body injections; react adds the `/entry.tsx` module script when there is an entry |
| `routesDir` | `derived<string \| null>` | The routes directory relative to the project root (`routes.dir` ?? `src/app/routes`); null when `routes: false` |
| `routerOptions` | `derived<RouterOptions \| null>` | The router plugin's options as data: `{ autoCodeSplitting: true, routesDirectory, generatedRouteTree }`, the last two expressions anchored on `.stack/vite.config.ts`; null when routing is off. A host that draws routes (`screens.viteConfig`) reads them, changes `autoCodeSplitting` and renders its own call with `routerPluginFor` from `@fcalell/plugin-react/codegen`, so no expression is edited by name |
| `routerPlugin` | `derived<AppPlugin \| null>` | TanStack's router plugin as `{ call, imports }`: `routerPluginFor(routerOptions)`, which is `tanstackRouter({ target, autoCodeSplitting, routesDirectory, generatedRouteTree })` with its import and `fileURLToPath`'s; null when routing is off. react contributes it to `vite.slots.appPlugins`, so the app's config runs it; a host that draws no route (Storybook's roster) never reads it |
| `entrySource` | `derived<string \| null>` | Final `.stack/entry.tsx` |
| `htmlSource` | `derived<string \| null>` | Final `.stack/index.html` |
| `providersSource` | `derived<string \| null>` | Final `.stack/virtual-providers.tsx`; null leaves plugin-vite's pass-through stub |
| `routesDtsSource` | `derived<string \| null>` | Final `.stack/routes.d.ts`: the router's `Register` over `.stack/routeTree.gen.ts`, which pulls the tree into the consumer's type-check; null when routing is off |
| `topLevelRoutes` | `derived<string[]>` | The static first segments of the routes' URLs under TanStack's file convention (through pathless layouts and groups, never a param), sorted; empty when routing is off. react-ui hands them to `auth.slots.reservedSlugs` |
| `homeScaffold` | `value<ScaffoldSpec \| null>` (`override`) | Scaffold for `<routesDir>/index.tsx`; null when routing is off; a design-system plugin overrides it with its own home |

## `reactUi.slots.*` (plugin-react-ui)

| Slot | Kind | Purpose |
|------|------|---------|
| `appCssImports` | `list<CssImport>` | CSS `@import`s aggregated into `.stack/app.css`: a URL, or `{ url, layer?, supports?, source? }`. react-ui imports `tailwindcss` with `source: "none"`, so Tailwind scans only the sheet's `@source` declarations (the consumer's `src`, the plugin's `src/ui` and ui-core), never the generated files in `.stack/` |
| `appCssBlocks` | `list<CssBlock>` | Top-level `@theme` / `@utility` / `@custom-variant` blocks, rendered after `@source` and before the layers. None of the three at-rules may sit inside a `@layer`, which is why they don't ride `appCssLayers`. react-ui's own `touch:` variant rides here, over the density layer's condition |
| `appCssLayers` | `list<{ name, content }>` | CSS `@layer` blocks. Dark mode and density ride this slot as `@layer base`: `@theme` compiles into `@layer theme` and Tailwind sorts `base` after it, so a layered `.dark { … }` or `:root[data-density="desktop"] { … }` overrides the seeded values |
| `fonts` | `derived<FontEntry[]>` | Resolved font files (consumer options or `defaultFonts`: IBM Plex Sans on its `wght` axis, IBM Plex Mono at 400, 500 and 600); `[]` loads none. The families the roles bind to are the theme's `fonts` knob, emitted by ui-core |
| `resolvedTheme` | `derived<ResolvedTheme>` | The `theme` option run through `@fcalell/ui-core`'s `deriveTheme`, resolved once so every block contribution reads one value |
| `appCssSource` | `derived<string \| null>` | Final `.stack/app.css`; null when nothing landed |

## `screens.slots.*` (plugin-screens)

| Slot | Kind | Purpose |
|------|------|---------|
| `handlerModules` | `list<string>` (sorted) | Module specifiers of endpoints a plugin owns outside the app's router: each default-exports an array of MSW request handlers, imported by the screens host's virtual module and answered beside the app's procedures in every story. plugin-auth contributes `@fcalell/plugin-auth/screens`: a signed-in session (better-auth's `Session` and `User`, fixed values) answering `GET */api/auth/get-session`, the one call `useSession()` makes, at the `AUTH_PREFIX` the worker mounts auth under. Its other endpoints fall to the host's `no fixture` answer, since `/api/auth` is one of `routePrefixes`. A config without `screens` leaves the contribution unread |
| `previewGlobals` | `list<PreviewGlobal>` (sorted by name) | Toolbar globals a plugin pins on the document root before a story paints, as data so the host knows no design system: `{ name, title, values, default, checked?, apply }`, where `checked` is the values `stack screens test` checks every screen in (only `default` when absent) and `apply` is `{ attribute }` (the value is set as that attribute) or `{ classes }` (a map from a value to the class it adds; the other classes of the map are removed). The host renders each as a Storybook toolbar select (`globalTypes`, `initialGlobals`) and applies them in its decorator, reading the list from its virtual module. react-ui contributes `mode` (`light`, `dark`; `{ classes: { dark: "dark" } }`; opening on the theme's `defaultMode`, else `light`) and `density` (`desktop`, `touch`; `{ attribute: "data-density" }`); `mode` is checked in `light` and `dark`, `density` at its default alone (density moves sizes, not names, roles or states) |
| `viteConfig` | `derived<string \| null>` | Final `.stack/screens.vite.config.ts` source: `renderViteConfig` over vite's input slots, with `clientHeaders: {}`, no `serverProxy` and no port, the screens package's own location in `fsAllow`, and one host-only plugin call, `screensPlugin({ stackDir, fixtures, routesDir, entryImports, routerBindings, prefixes, handlerModules, previewGlobals })`. It reads `react.slots.routesDir` (null: no output), the side-effect imports of `react.slots.entryImports` (the stylesheet) and the named imports of `react.slots.routerBindings` (what the entry calls with its router), `api.slots.routePrefixes` (the prefixes MSW answers) `handlerModules` and `previewGlobals`; the app's own `vite.slots.*` never receive a host-only call. It reads `react.slots.routerOptions` and runs the router plugin ahead of the app's `pluginCalls`, as the app's config does, with `autoCodeSplitting: false`: Vitest's `--changed` walk drops a split module (`?tsr-split=component`, an id that fails `existsSync`), so a component's edit would reach no screen; null when it is |
| `storybookMain` | `derived<string \| null>` | Final `.stack/screens/main.ts`, Storybook's config directory: one `screensMain({ floors: false })` call; null when `routesDir` is |
| `testMain` | `derived<string \| null>` | Final `.stack/screens-test/main.ts`: `screensMain({ floors: true })`, which also loads `@fcalell/plugin-screens/floors`; only the test run reads this directory; null when `routesDir` is |
| `vitestConfig` | `derived<string \| null>` | Final `.stack/screens.vitest.config.ts`: `viteConfig`'s file spread into a Vitest config with one browser project (the Storybook test plugin on `.stack/screens-test/`, Playwright on `CHROME_PATH` else its own browser, headless, 1280x800, `maxWorkers: 2`, `testTimeout: 120_000`); null when `viteConfig` is |

The plugin also contributes a `cliSlots.postWrite` hook that writes one CSF file per screen into `stack-screens/` at the app root (`gitignore`d and removed with the plugin; no dot directory, which Storybook's watcher ignores): created for a new route, rewritten when its content changed, removed for a deleted one. A file is the route's id and the imports of its graph (the root route, each layout route, the route, its lazy sibling, the fixtures), as side effects so the transform keeps every edge; it exports each state's dev story and, for every combination of the globals' `checked` values other than the defaults, a `!dev` story named for it (`Data, dark`) with story-level `globals`, which only the test run lists. While `stack screens dev` runs `screensPlugin` syncs the folder on the routes directory's add, change and unlink events.

`@fcalell/plugin-screens/node` exports `writeStorybookConfig({ config, cwd })`, which a Storybook of the app's own that draws components (the showcase's roster) calls from its `.storybook/main.ts` and its `vitest.config.ts`, with the app's `stack.config.ts`. It builds the slot graph (`buildGraphFromConfig`), resolves vite's slots, renders them with `renderViteConfig` as the screens host does (`clientHeaders: {}`, no `serverProxy` and no port) and one host-only plugin call, `storybookHost()`, which starts the dependency optimizer (Storybook runs Vite in middleware mode and never calls `server.listen()`, the call that starts it), writes `.stack/storybook.vite.config.ts` and returns its path, for Storybook's `viteConfigPath` and Vite's `loadConfigFromFile`. The router plugin is out because `vite.slots.pluginCalls` holds none (it is in `appPlugins`); no `screensPlugin`, no route tree and no fixtures reach it. It is a function and not a slot, so a consumer without such a Storybook gets no file; `generate` never writes it.

`@fcalell/plugin-screens/fixtures` exports `defineFixtures<AppRouter>(procedures, params)`, the default export of the app's `src/app/fixtures.ts`: `procedures` is `Fixtures<AppRouter>` (each procedure optional, `(input) => output` by its `Procedure<I, O>` type) and `params` an example value per route `$param` name.

`@fcalell/plugin-api/client` exports `isNotFound(error)`: the check for the `ORPCError` code `NOT_FOUND` that stack's procedures throw, which plugin-api's own client reads and the screens host answers.

## `expo.slots.*` (plugin-expo)

| Slot | Kind | Purpose |
|------|------|---------|
| `metroConfigImports` | `list<MetroRequireSpec>` | Requires for the generated `.stack/metro.config.cjs` |
| `metroPluginCalls` | `list<MetroWrapperSpec>` | Wrapper calls composed around the Metro config (order-sorted) |
| `expoConfigPlugins` | `list<ExpoConfigPlugin>` | Expo config plugins baked into `.stack/app.config.cjs` |
| `providers` | `list<ProviderSpec>` | JSX providers composed around `<ExpoRoot>` in `.stack/entry.tsx` (lower order = outer) |
| `entryImports` | `list<TsImportSpec>` | Extra imports for `.stack/entry.tsx` |
| `devServerPort` | `value<number>` | Metro dev-server port (`options.port` ?? default); also drives the localhost CORS origin contributed to plugin-api |
| `routesPagesDir` | `derived<string \| null>` | expo-router pages dir; null when `routes: false` |
| `easBuildProfiles` | `value<string[]>` | EAS build profile names the `expo build` command validates against |
| `easUpdateChannel` | `value<string>` | Default EAS Update channel |
| `metroConfig` | `derived<string \| null>` | Final `.stack/metro.config.cjs` source |
| `expoConfig` | `derived<string \| null>` | Final `.stack/app.config.cjs` source (name, slug, scheme, bundle ids, config plugins) |
| `entrySource` | `derived<string \| null>` | Final `.stack/entry.tsx` source (imports + providers around `<ExpoRoot>`) |
| `routesDtsSource` | `derived<string \| null>` | `.stack/routes.d.ts`: expo-router's typed-routes declaration over the routes directory, from the generator the app's Expo CLI runs; null when routing is off |

## `nativeUi.slots.*` (plugin-native-ui)

| Slot | Kind | Purpose |
|------|------|---------|
| `resolvedTheme` | `derived<ResolvedTheme>` | The `theme` option run through `@fcalell/ui-core`'s `deriveTheme`, resolved once |
| `fonts` | `derived<NativeFontEntry[]>` | Resolved font files (`{ family, source }`, consumer option or none); each `source` is embedded through expo-font. The families are the theme's `fonts` knob |
| `appCssImports` | `list<string>` | Extra CSS `@import`s aggregated into `.stack/global.css` beyond tailwindcss + uniwind |
| `appCssSource` | `derived<string \| null>` | Final `.stack/global.css`: `@theme` from ui-core's records (namespace resets first), the two elevation utilities as `@utility` blocks, and `@variant light` / `@variant dark` color blocks under `@layer theme` |
| `nativeAuthSource` | `derived<string>` | `.stack/native-auth.ts` source: the `scheme` (`api.slots.nativeScheme`) and `cookiePrefix` (`auth.slots.cookiePrefix`) constants the scaffolded `src/lib/auth.ts` imports, so the native client can never drift from the app config or the worker's cookie prefix |
| `nativeThemeSource` | `derived<string \| null>` | `.stack/native-theme.ts` source: a `Uniwind.setTheme` call with the theme's `defaultMode`, imported for its side effect by the expo entry; null (no file, no import) without the knob, so uniwind follows the system |

## `auth.slots.*` (plugin-auth)

| Slot | Kind | Purpose |
|------|------|---------|
| `runtimeOptions` | `derived<Record<string, TsExpression>>` | Better Auth runtime options; reads `api.slots.cors` for `trustedOrigins` and the default passkey `origin`, and `api.slots.devCorsOrigins` then `api.slots.devTargetOrigins` for `devTrustedOrigins` and passkey `devOrigin` (both dev-gated by the runtime), `auth.slots.reservedSlugs` for `reservedSlugs`, and `api.slots.nativeScheme` for the native `trustedOrigins` under `expo: true` (refusing to generate when it is null); bakes passkey `rpID`/`rpName` from `app` |
| `appUrlDevDefault` | `derived<string>` | Canonical dev URL for `APP_URL`'s dev default: the first `api.slots.devCorsOrigins` entry (a frontend's), else the first `api.slots.devTargetOrigins` entry (the deploy target's), else `https://<domain>` |
| `callbackFile` | `value<string>` | Consumer callback-file path (default `src/worker/plugins/auth.ts`); override for a restructured worker layout |
| `cookiePrefix` | `value<string>` | Resolved session-cookie prefix (`cookies.prefix` ?? better-auth's `"better-auth"` default); read by native-ui's generated auth-client constants |
| `clientFlags` | `value<AuthClientFlags \| null>` | The web client's `{ passkey, emailOtp, magicLink, organization, mcp }`, from the options, `organization` carrying the access control's statements and role grants as the worker gets them; seeded null and filled by auth's own contribution, so a reader without auth in the config sees null |
| `reservedSlugs` | `list<string>` | The app's top-level routes, which an organization slug may not take (an organization is served at `/<slug>`). With organizations on, `runtimeOptions` bakes them beside plugin-api's `RESERVED_SLUGS` and the runtime refuses them on organization create and update |

Auth also contributes to other plugins' slots (`api.slots.*`, `cloudflare.slots.*`, `db.slots.schemaModules`, `screens.slots.handlerModules`); those rows name it.

The `./screens` subpath is the one place auth touches MSW, through `@fcalell/plugin-screens/msw` (a re-export of the app's copy, so the host runs one), and `@fcalell/plugin-screens` is a dependency of auth only for its slots, as `cloudflare` and `db` are: its Storybook and MSW packages are optional peers `stack add screens` installs.

## `db.slots.*` (plugin-db)

| Slot | Kind | Purpose |
|------|------|---------|
| `schemaModules` | `list<string>` | Modules whose tables the scaffolded `src/schema/index.ts` re-exports (`export *`), so they migrate with the app's own; auth contributes its `/schema` subpath, plus `/schema/organization`, `/schema/passkey` and `/schema/oauth` when those are on |

## Spec types

The shapes carried by slot payloads. Most are exported from `@fcalell/cli/ast` (TS / TOML / HTML
specs) or `@fcalell/cli/specs` (lifecycle specs); a payload that only one plugin's own slots carry
lives with that plugin.

- `ScaffoldSpec`: `{ target: string; plugin: string }` plus either `source: URL` (a template on
  disk, built with `ctx.scaffold(name, target)`) or `content: string` (text the plugin composed
  from the graph, as db's schema scaffold does).
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
- `EnvSpec`: `api.slots.env`'s payload, declared in `plugins/api/src/types.ts` (exported on
  `@fcalell/plugin-api/types`): `{ name, devDefault, validate?: EnvValidation }`.
- `WranglerBindingSpec`: `d1` / `kv` / `r2` / `analytics_engine` / `rate_limiter` / `var` shapes.
  Aggregator catches duplicate `binding` names and fails fast.
- `HtmlInjection`: `title` / `meta` / `link` / `script` / `html-attr`.
- `ProviderSpec`: `{ imports, wrap?, siblings?, order }` for JSX provider composition.
- `MiddlewareSpec`: `{ imports, call, phase: "before-cors" | "after-cors" | "before-routes" | "after-routes" | "after-context", order }`.
- `PluginRuntimeEntry`: `{ plugin, import, identifier, options? }` describing a `.use(xRuntime(opts))` call; `api.slots.testingEntries` carries the same shape for a `.use(xTesting(opts))` call on the test entry.
- `GuideEntry`: `{ domain, package, page, trigger }`, one index line: `trigger` says when to open
  the page (never what it holds), the page is `node_modules/<package>/guide/<page>.md`, and entries
  group under `domain`.
- `ProcessSpec`, `WatcherSpec`, `BuildStep`, `DeployStep`, `DeployCheck`, `PromptSpec`,
  `DevReadyTask`, `GeneratedFile`: exported from `@fcalell/cli/specs`. `ProcessSpec.env` merges
  extra environment variables over the parent env at spawn (per-process dev signals like
  `STACK_DEV=1` on targets without `.dev.vars`; node's dev process also carries the
  `devDefault` of each `api.slots.env` var the shell leaves unset).
