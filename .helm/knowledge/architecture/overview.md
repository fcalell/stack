# Architecture overview

`@fcalell/stack` is a pnpm monorepo: `packages/` (core CLI + shared configs) and `plugins/` (one
self-contained feature unit per domain). The CLI owns orchestration and the slot graph; every
feature lives in the plugin that owns its domain (see
[philosophy](../product/philosophy.md)). Per-change gate: `pnpm check` (build, type-check,
every package's `node --test`, Biome lint).

## Packages

| Package | Purpose |
|---------|---------|
| `@fcalell/cli` | `defineConfig()`, `plugin()`, `slot.*`, `stack` CLI, slot graph engine, codegen |
| `@fcalell/ui-core` | The design contract both UI plugins render from: the knob-derived token records, `deriveTheme`, the emit helpers, `words`, `cn()`, the platform-invariant variant matrices and the component roster. Framework-free build-time data |
| `@fcalell/typescript-config` | tsconfig presets (base, solid-vite, node-tsx) and the `build` emit overlay |
| `@fcalell/biome-config` | Shareable Biome formatter/linter config |
| `@fcalell/auth-testing` | Private, never published: the test support the sign-in tests share (a software WebAuthn authenticator, a cookie jar, session minting, table creation from drizzle schemas) |

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
| `@fcalell/plugin-expo` | Expo/React Native: Metro + app config + expo-router entry + EAS commands | `expo()` |
| `@fcalell/plugin-solid` | SolidJS compilation, file-based routing, app bootstrap | `solid()` |
| `@fcalell/plugin-solid-ui` | Design system on the web: the ui-core roster in SolidJS + Kobalte + Tailwind v4, the shell at every width, fonts, words, geometry gate | `solidUi()` |
| `@fcalell/plugin-native-ui` | Design system on the phone: the ui-core roster in React Native + Expo + uniwind, the phone layout at every width, fonts, words, native providers, geometry gate | `nativeUi()` |

## Dependency graph

Cross-plugin dataflow is expressed as typed slot imports: plugin A imports `pluginB.slots.foo` and
either contributes to it or derives from it. The graph engine resolves topology automatically.
`requires: ["plugin"]` only declares presence (for nicer error messages); ordering falls out of the
slot edges.

```
@fcalell/cli               (core — defineConfig, plugin, slot.*, slot graph, CLI)

plugin-cloudflare ────────> cli (owns cloudflare.slots.bindings/vars/routes/wranglerToml;
                                 derives from api.slots.env / routePrefixes, empty without api)
plugin-vite ──────────────> cli (owns vite.slots.configImports/pluginCalls/devServerPort/viteConfig;
                                 contributes to api.slots.devCorsOrigins for localhost dev)
plugin-expo ──────────────> cli (owns expo.slots.metroConfig/expoConfig/entrySource/routesDtsSource,
                                 providers, easBuildProfiles/easUpdateChannel;
                                 contributes to api.slots.devCorsOrigins for the Metro dev origin,
                                 api.slots.middlewareEntries + cloudflare.slots.bindings for the
                                 version gate and its telemetry dataset)
plugin-db ────────────────> cli, requires api
                                 (contributes to cloudflare.slots.bindings, api.slots.env (sqlite's DB_FILE),
                                  api.slots.pluginRuntimes / workerImports)
plugin-auth ──────────────> cli, requires api + db
                                 (owns auth.slots.runtimeOptions — derived from api.slots.cors;
                                  contributes to cloudflare.slots.bindings, api.slots.env/pluginRuntimes/callbacks)
plugin-api ───────────────> cli (owns api.slots.workerImports/pluginRuntimes/middlewareEntries/cors/callbacks/env/workerSource;
                                 never imports a deploy target)
plugin-node ──────────────> cli, requires api
                                 (owns node.slots.serverPort/services/serverSource;
                                  derives from api.slots.workerSource/routePrefixes/env;
                                  contributes to vite.slots.serverProxy for same-origin dev)
plugin-solid ─────────────> cli, requires vite
                                 (owns solid.slots.providers/entry/html/routesDts;
                                  contributes to vite.slots.configImports/pluginCalls)
plugin-solid-ui ──────────> cli + ui-core, requires solid + vite
                                 (owns solidUi.slots.appCss*/resolvedTheme;
                                  contributes to solid.slots.providers/homeScaffold, vite.slots.configImports/pluginCalls)
plugin-native-ui ─────────> cli + ui-core, requires expo + api + auth
                                 (owns nativeUi.slots.appCssImports/appCssSource/resolvedTheme/fonts;
                                  contributes to expo.slots.metroConfigImports/metroPluginCalls/
                                  expoConfigPlugins/providers, cliSlots.buildSteps/initScaffolds/
                                  removeFiles/tsconfigTypes)
```
