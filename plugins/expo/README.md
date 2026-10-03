# @fcalell/plugin-expo

The Expo/React Native target for `@fcalell/stack`. Generates the Metro config, the Expo app
config, the expo-router entry and typed routes, and mounts a native app on the same worker
`plugin-api` generates for the web.

## Install

```bash
pnpm add @fcalell/plugin-expo
```

`stack init` adds this when you pick `expo` in the interactive picker; `stack add expo` does the
same for an existing project.

## Guide

How to build on the plugin lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`add-a-phone-screen.md`](./guide/add-a-phone-screen.md), the recipe;
[`routes.md`](./guide/routes.md), the expo-router files; [`options.md`](./guide/options.md), the
options and the root files; [`builds.md`](./guide/builds.md), the commands and `eas.json`;
[`api-client.md`](./guide/api-client.md), `src/lib/api.ts`;
[`native-auth.md`](./guide/native-auth.md), signing in on the phone; and
[`version-gate.md`](./guide/version-gate.md), `minNativeBuild`.

## What it generates

| File | Source |
|------|--------|
| `.stack/metro.config.cjs` | `expo.slots.metroConfig` |
| `.stack/app.config.cjs` | `expo.slots.expoConfig` |
| `.stack/entry.tsx` | `expo.slots.entrySource` |
| `.stack/routes.d.ts` | `expo.slots.routesDtsSource` (skipped when routing is disabled) |
| `.stack/expo-env.d.ts` | Static ambient-types reference |

The generated configs are `.cjs`: the root shims `require()` them through Node, and the consumer
is `type: module`, so a `.js` would parse as ESM. `.stack/metro.config.cjs` sets Metro's
`projectRoot` to the consumer root (one level above `.stack/`), so the entry's
`require.context("../src/app")` and uniwind's paths resolve. `.stack/routes.d.ts` only references
`expo-router/types`; expo-router's own generator writes the augmentation.

## Owned slots

| Slot | Kind | Purpose |
|------|------|---------|
| `expo.slots.metroConfigImports` | `list<MetroRequireSpec>` | `require()`s for `.stack/metro.config.cjs` |
| `expo.slots.metroPluginCalls` | `list<MetroWrapperSpec>` | Metro config wrapper calls |
| `expo.slots.expoConfigPlugins` | `list<ExpoConfigPlugin>` | Entries for the app.config `plugins` array |
| `expo.slots.providers` | `list<ProviderSpec>` | JSX wrappers around the expo-router root |
| `expo.slots.entryImports` | `list<TsImportSpec>` | Imports for `.stack/entry.tsx` |
| `expo.slots.devServerPort` | `value<number>` | Resolved Metro dev-server port |
| `expo.slots.routesPagesDir` | `derived<string \| null>` | Resolved routes directory, `null` when routing is disabled |
| `expo.slots.easBuildProfiles` | `value<string[]>` | EAS build profile names |
| `expo.slots.easUpdateChannel` | `value<string>` | Default EAS Update channel |
| `expo.slots.metroConfig` | `derived<string \| null>` | Final `.stack/metro.config.cjs` |
| `expo.slots.expoConfig` | `derived<string \| null>` | Final `.stack/app.config.cjs` |
| `expo.slots.entrySource` | `derived<string \| null>` | Final `.stack/entry.tsx` |
| `expo.slots.routesDtsSource` | `derived<string \| null>` | Final `.stack/routes.d.ts` |

`plugin-expo` also contributes its dev-server localhost origin to `api.slots.devCorsOrigins`
(gated on `app.origins` not being set), which the worker honours only under `STACK_DEV`, its
deep-link scheme (`scheme` ?? the slug of `app.name`, the one `.stack/app.config.cjs` registers)
to `api.slots.nativeScheme`, and,
when `minNativeBuild` is configured, the version-gate middleware to `api.slots.middlewareEntries`
(`after-cors`, `order: 0`, resolving `api.slots.routePrefixes` for the gate's scope) plus its
telemetry dataset to `cloudflare.slots.bindings`. It points the consumer's `package.json` `main` at
`.stack/entry.tsx` while routing is on.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-expo` | `expo()`, `ExpoOptions` |
| `@fcalell/plugin-expo/client` | `versionHeaders()`, `createVersionGatedFetch()`, `onUpdateRequired()` |
| `@fcalell/plugin-expo/version-gate` | `versionGate()`, `VersionGateOptions`, `CLIENT_BUILD_HEADER`, `CLIENT_PLATFORM_HEADER` |

## License

MIT
