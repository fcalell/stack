# Architecture overview

`@fcalell/stack` is a pnpm monorepo: `packages/` (core CLI + shared configs), `plugins/` (one
self-contained feature unit per domain) and `apps/` (`showcase`, a private consumer that renders
the roster's showcase page). The CLI owns orchestration and the slot graph; every
feature lives in the plugin that owns its domain (see
[philosophy](../product/philosophy.md)). Per-change gate: `pnpm check` (build, type-check,
every package's `node --test`, Biome lint).

## Packages

| Package | Purpose |
|---------|---------|
| `@fcalell/cli` | `defineConfig()`, `plugin()`, `slot.*`, `stack` CLI, slot graph engine, codegen |
| `@fcalell/ui-core` | The design contract both UI plugins render from: the knob-derived token records, `deriveTheme`, the emit helpers, `words`, `cn()`, the platform-invariant variant matrices and the component roster. Framework-free build-time data |
| `@fcalell/typescript-config` | tsconfig presets (base, node-tsx, web-vite) and the `build` emit overlay |
| `@fcalell/biome-config` | Shareable Biome formatter/linter config |
| `@fcalell/auth-testing` | Private, never published: the test support the sign-in tests share that no consumer uses (a software WebAuthn authenticator, a cookie jar, a browser helper, table creation from drizzle schemas); signing a test in is public, in `@fcalell/plugin-auth/testing` |

## Plugins

Plugins are self-contained feature units built with `plugin()`. Each declares a config schema,
owned slots, slot contributions, optional commands, optional callbacks, and an optional worker
runtime export.

| Plugin | Purpose | Config factory |
|--------|---------|----------------|
| `@fcalell/plugin-cloudflare` | Cloudflare bindings, wrangler.toml codegen, `wrangler types` Env generation | `cloudflare()` |
| `@fcalell/plugin-db` | Drizzle ORM clients and runtimes (D1 on cloudflare, SQLite on node), schema tooling, migrations | `db()` |
| `@fcalell/plugin-auth` | Better Auth integration (email OTP, OAuth, passkeys, consumer plugins), RBAC, access control, web and native clients | `auth()` |
| `@fcalell/plugin-api` | API framework: Hono + oRPC, procedure builder, typed client | `api()` |
| `@fcalell/plugin-node` | Long-running Node server target: serves the worker + static SPA, background services, typed WebSocket surface | `node()` |
| `@fcalell/plugin-vite` | Framework-agnostic Vite lifecycle (providers virtual module) | `vite()` |
| `@fcalell/plugin-react` | React on the web: Vite + React Compiler, TanStack Router file routes, app entry, providers, HTML shell and `<head>` metadata | `react()` |
| `@fcalell/plugin-react-ui` | Design system on the web: `.stack/app.css` from the ui-core contract on Tailwind v4, fonts, the mode script, words, the roster components over Base UI, and the showcase page | `reactUi()` |
| `@fcalell/plugin-expo` | Expo/React Native: Metro + app config + expo-router entry + EAS commands | `expo()` |
| `@fcalell/plugin-native-ui` | Design system on the phone: the ui-core roster in React Native + Expo + uniwind, the phone layout at every width, fonts, words, native providers | `nativeUi()` |

## Dependency graph

Cross-plugin dataflow is expressed as typed slot imports: plugin A imports `pluginB.slots.foo` and
either contributes to it or derives from it. The graph engine resolves topology automatically.
`requires` only declares presence, by name or as a one-of (for nicer error messages and init's
and add's auto-pull); ordering falls out of the slot edges.

```
@fcalell/cli               (core — defineConfig, plugin, slot.*, slot graph, CLI)

plugin-cloudflare ────────> cli (owns cloudflare.slots.bindings/vars/routes/wranglerToml;
                                 derives from api.slots.env / routePrefixes, empty without api;
                                 contributes to vite.slots.serverProxy for same-origin dev)
plugin-vite ──────────────> cli (owns vite.slots.configImports/pluginCalls/devServerPort/viteConfig;
                                 contributes to api.slots.devCorsOrigins for localhost dev)
plugin-react ─────────────> cli, requires vite
                                 (owns react.slots.providers/entryImports/mountExpression/htmlShell/
                                  htmlHead/htmlBodyEnd/routesDir/entrySource/htmlSource/providersSource/
                                  routesDtsSource/topLevelRoutes/homeScaffold;
                                  contributes to vite.slots.configImports/pluginCalls/resolveDedupe,
                                  cliSlots.postWrite (the route tree)/initScaffolds/removeFiles)
plugin-react-ui ──────────> cli + ui-core, requires react + vite
                                 (owns reactUi.slots.appCssImports/appCssBlocks/appCssLayers/fonts/
                                  resolvedTheme/appCssSource;
                                  contributes to vite.slots.configImports/pluginCalls/fsAllow,
                                  react.slots.providers/entryImports, auth.slots.reservedSlugs
                                  (from react.slots.topLevelRoutes), cliSlots.buildSteps)
plugin-expo ──────────────> cli (owns expo.slots.metroConfig/expoConfig/entrySource,
                                 providers, easBuildProfiles/easUpdateChannel;
                                 contributes to api.slots.devCorsOrigins for the Metro dev origin,
                                 api.slots.nativeScheme for its deep-link scheme,
                                 api.slots.middlewareEntries + cloudflare.slots.bindings for the
                                 version gate and its telemetry dataset)
plugin-db ────────────────> cli, requires api
                                 (contributes to cloudflare.slots.bindings, api.slots.env (sqlite's DB_FILE),
                                  api.slots.pluginRuntimes / workerImports, and d1's local test D1
                                  to api.slots.testingEntries / testingImports; optional peer
                                  wrangler for its ./testing subpath. wrangler 4.147.0 pins
                                  miniflare 5.20261001.0-alpha, patched in pnpm-workspace.yaml's
                                  patchedDependencies: runtime requests drop the per-request
                                  reset and the runtime Pool closes idle sockets after 1s, so a
                                  test's D1 calls reuse one loopback connection instead of one
                                  each (a long suite otherwise hits EADDRNOTAVAIL on macOS).
                                  Covers stack's own install and a consumer linking ../stack,
                                  never a consumer installing stack from GitHub. Removed, with
                                  its patchedDependencies key, in the wrangler bump that resolves
                                  a miniflare carrying upstream's fix
                                  (cloudflare/workers-sdk#15716, PR #15781); the exact-version
                                  key fails any other miniflare's install until then)
plugin-auth ──────────────> cli, requires api + db
                                 (owns auth.slots.runtimeOptions — derived from api.slots.cors and api.slots.nativeScheme;
                                  contributes to cloudflare.slots.bindings, api.slots.env/pluginRuntimes/callbacks,
                                  and the test entry's sign-in to api.slots.testingEntries)
plugin-api ───────────────> cli, requires exactly one of cloudflare or node (default cloudflare)
                                 (owns api.slots.workerImports/pluginRuntimes/middlewareEntries/cors/nativeScheme/callbacks/env/workerSource;
                                 never imports a deploy target)
plugin-node ──────────────> cli, requires api
                                 (owns node.slots.serverPort/services/serverSource;
                                  derives from api.slots.workerSource/routePrefixes/env;
                                  contributes to vite.slots.serverProxy for same-origin dev)
plugin-native-ui ─────────> cli + ui-core, requires expo + api + auth
                                 (owns nativeUi.slots.appCssImports/appCssSource/resolvedTheme/fonts;
                                  contributes to expo.slots.metroConfigImports/metroPluginCalls/
                                  expoConfigPlugins/providers, cliSlots.buildSteps/initScaffolds/
                                  removeFiles/tsconfigTypes)
```
