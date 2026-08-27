# Architecture overview

`@fcalell/stack` is a pnpm monorepo: `packages/` (core CLI + shared configs) and `plugins/` (one
self-contained feature unit per domain). The CLI owns orchestration and the slot graph; every
feature lives in the plugin that owns its domain (see
[philosophy](../product/philosophy.md)). Per-change gate: `pnpm check` (Biome lint + type-check).

## Packages

| Package | Purpose |
|---------|---------|
| `@fcalell/cli` | `defineConfig()`, `plugin()`, `slot.*`, `stack` CLI, slot graph engine, codegen |
| `@fcalell/ui-core` | The design contract both UI plugins render from: the token records, `deriveTheme`, the emit helpers, `cn()`, and the platform-invariant variant matrices. Framework-free build-time data |
| `@fcalell/typescript-config` | tsconfig presets (base, solid-vite, node-tsx) |
| `@fcalell/biome-config` | Shareable Biome formatter/linter config |

## Plugins

Plugins are self-contained feature units built with `plugin()`. Each declares a config schema,
owned slots, slot contributions, optional commands, optional callbacks, and an optional worker
runtime export.

| Plugin | Purpose | Config factory |
|--------|---------|----------------|
| `@fcalell/plugin-cloudflare` | Cloudflare bindings, wrangler.toml codegen, `wrangler types` Env generation | `cloudflare()` |
| `@fcalell/plugin-db` | Drizzle ORM clients (D1/SQLite), schema tooling, migrations | `db()` |
| `@fcalell/plugin-auth` | Better Auth integration, RBAC, access control | `auth()` |
| `@fcalell/plugin-api` | API framework: Hono + oRPC, procedure builder, typed client | `api()` |
| `@fcalell/plugin-node` | Long-running Node server target: serves the worker + static SPA, background services, typed WebSocket surface | `node()` |
| `@fcalell/plugin-vite` | Framework-agnostic Vite lifecycle (providers virtual module) | `vite()` |
| `@fcalell/plugin-expo` | Expo/React Native: Metro + app config + expo-router entry + EAS commands | `expo()` |
| `@fcalell/plugin-solid` | SolidJS compilation, file-based routing, app bootstrap | `solid()` |
| `@fcalell/plugin-solid-ui` | Design system: SolidJS + Kobalte + Tailwind v4 + CVA components, fonts, typography tokens | `solidUi()` |
| `@fcalell/plugin-native-ui` | Design system: React Native + Expo + uniwind + CVA primitives, fonts, native providers, geometry gate | `nativeUi()` |

## Dependency graph

Cross-plugin dataflow is expressed as typed slot imports: plugin A imports `pluginB.slots.foo` and
either contributes to it or derives from it. The graph engine resolves topology automatically.
`requires: ["plugin"]` only declares presence (for nicer error messages); ordering falls out of the
slot edges.

```
@fcalell/cli               (core — defineConfig, plugin, slot.*, slot graph, CLI)

plugin-cloudflare ────────> cli (owns cloudflare.slots.bindings/secrets/vars/routes/wranglerToml)
plugin-vite ──────────────> cli (owns vite.slots.configImports/pluginCalls/devServerPort/viteConfig;
                                 contributes to api.slots.corsOrigins for localhost dev)
plugin-expo ──────────────> cli (owns expo.slots.metroConfig/expoConfig/entrySource/routesDtsSource,
                                 providers, easBuildProfiles/easUpdateChannel;
                                 contributes to api.slots.corsOrigins for the Metro dev origin)
plugin-db ────────────────> cli, requires cloudflare + api
                                 (contributes to cloudflare.slots.bindings, api.slots.pluginRuntimes / workerImports)
plugin-auth ──────────────> cli, requires api + cloudflare + db
                                 (owns auth.slots.runtimeOptions — derived from api.slots.cors;
                                  contributes to cloudflare.slots.bindings/secrets, api.slots.pluginRuntimes/callbacks)
plugin-api ───────────────> cli (owns api.slots.workerImports/pluginRuntimes/middlewareEntries/cors/callbacks/workerSource)
plugin-node ──────────────> cli, requires api
                                 (owns node.slots.serverPort/services/serverSource;
                                  derives from api.slots.workerSource/routePrefixes;
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
