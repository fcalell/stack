# @fcalell/plugin-expo

The Expo/React Native target for `@fcalell/stack`. Generates the Metro config, the Expo app config, the expo-router entry, and typed routes, and mounts a native app on the same worker `plugin-api` generates for the web.

## Install

```bash
pnpm add @fcalell/plugin-expo
```

`stack init` adds this when you pick `expo` in the interactive picker; `stack add expo` does the same for an existing project.

## What it generates

| File | Source |
|------|--------|
| `.stack/metro.config.cjs` | `expo.slots.metroConfig` |
| `.stack/app.config.cjs` | `expo.slots.expoConfig` |
| `.stack/entry.tsx` | `expo.slots.entrySource` |
| `.stack/routes.d.ts` | `expo.slots.routesDtsSource` (skipped when routing is disabled) |
| `.stack/expo-env.d.ts` | Static ambient-types reference |

Root files (`metro.config.js`, `app.config.ts`, `babel.config.cjs`, `eas.json`) are scaffolded once at `stack init`/`stack add` and re-export from `.stack/`. `src/lib/api.ts` is scaffolded the same way: an editable starter, not a generated artifact. See [Native client](#native-client) below.

## Config options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `8081` | Metro dev-server port |
| `routes` | `false \| { appDir?: string }` | `{ appDir: "src/app" }` | File-based routing via expo-router. `false` disables it (bare RN) |
| `scheme` | `string` | app slug | Deep-link / OAuth-redirect URL scheme |
| `easProfiles` | `string[]` | `["development", "preview", "production"]` | EAS build profile names |
| `updateChannel` | `string` | `"production"` | Default EAS Update channel |
| `configPlugins` | `ConfigPluginSpec[]` | `[]` | Extra Expo config plugins (native modules) merged into `app.config`'s `plugins` array |
| `minNativeBuild` | `{ ios?: number; android?: number }` | both `0` | Client version gate floor, see below |

```ts
import { expo } from "@fcalell/plugin-expo";

expo({
  minNativeBuild: { ios: 42, android: 40 },
});
```

## Client version gate

A native build can't be force-updated the way a web page reloads. When a backend change breaks old clients, `minNativeBuild` walls builds below a per-platform floor with `426 Upgrade Required` instead of letting them run into undefined behavior.

Set the floor by hand, atomically with the breaking change:

```ts
expo({ minNativeBuild: { ios: 42, android: 40 } });
```

A platform left out of `minNativeBuild` floors at `0` (every build of that platform passes). Leaving `minNativeBuild` out entirely, or setting both platforms to `0`, keeps the gate dormant: no middleware lands in the emitted worker at all.

The gate reads two request headers:

| Header | Value |
|--------|-------|
| `x-stack-client-build` | The native build number, as a string of digits |
| `x-stack-client-platform` | `"ios"` or `"android"` |

Both names are exported as `CLIENT_BUILD_HEADER` and `CLIENT_PLATFORM_HEADER` from `@fcalell/plugin-expo/version-gate`. `@fcalell/plugin-expo/client` (below) stamps them on every request.

A request **fails open** (passes through untouched) when:

- either header is missing,
- `x-stack-client-build` isn't all digits (`"1.2.3"`, `""`, non-numeric),
- or `x-stack-client-platform` is neither `"ios"` nor `"android"`.

The gate never walls `/api/auth/*` (a stranded user must still be able to re-auth after updating) or `/` (liveness). The wall is a UX nudge, not a security control: a request that can't be confidently read as "this is a stale native client" always passes.

Below the floor, the gate short-circuits with:

```json
{ "code": "UPGRADE_REQUIRED", "message": "A newer version of the app is required." }
```

`426` and stops the request before it reaches CORS's downstream middleware, per-procedure rate limits, or the procedure itself, so a walled client's retry storm sees `426` and never a confusing `429`.

## Native client

`stack init`/`stack add` scaffolds `src/lib/api.ts`: a typed oRPC client (`@fcalell/plugin-api/client`) wired to `.stack/worker`'s `AppRouter` and stamped with the version-gate headers on every request. No config is required. The two headers go out regardless of whether `minNativeBuild` is set, so the gate can be turned on later without a client change.

```ts
// src/lib/api.ts
import { createClient } from "@fcalell/plugin-api/client";
import { createApiQueryUtils } from "@fcalell/plugin-api/tanstack-query";
import { createVersionGatedFetch } from "@fcalell/plugin-expo/client";
import type { AppRouter } from "../../.stack/worker";

const client = createClient<AppRouter>({
  url: `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787"}/rpc`,
  fetch: createVersionGatedFetch(),
});

export const orpc = createApiQueryUtils(client);
```

`@fcalell/plugin-expo/client` exports:

| Export | Purpose |
|--------|---------|
| `versionHeaders()` | Reads the native build number (`expo-application`'s `nativeBuildVersion`) and platform (`react-native`'s `Platform.OS`); returns `{}` (never throws) when either is undetectable |
| `createVersionGatedFetch(base?)` | Wraps `fetch` (defaults to the global): stamps `versionHeaders()` on every request, passes the response through, and notifies `onUpdateRequired` subscribers on a `426` |
| `onUpdateRequired(cb)` | Subscribes to the 426 signal; returns an unsubscribe function |

Rendering the update-wall screen itself is app territory: call `onUpdateRequired` wherever your app decides how to show it (a modal, a full-screen route). `plugin-expo` only carries the signal.

`orpc`'s query utilities need `@tanstack/react-query` + `@orpc/tanstack-query` installed. `nativeUi()` wires both, along with the `QueryClientProvider` `useQuery`/`useMutation` need at runtime; using `expo()` without `nativeUi()` requires installing them by hand.

## Commands

| Command | Description |
|---------|-------------|
| `stack expo dev [--clear]` | Start the Metro dev server (`expo start`) |
| `stack expo prebuild [--clean] [--platform ios\|android]` | Generate native `ios/`/`android/` projects |
| `stack expo build [--profile <name>] [--platform ios\|android\|all]` | Create a native build with EAS Build |
| `stack expo update [--channel <name>] [--message <text>]` | Publish an OTA update with EAS Update |

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

`plugin-expo` also contributes its dev-server localhost origin to `api.slots.corsOrigins` (gated on `app.origins` not being set) and, when `minNativeBuild` is configured, the version-gate middleware to `api.slots.middlewareEntries`.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-expo` | `expo()`, `ExpoOptions` |
| `@fcalell/plugin-expo/client` | `versionHeaders()`, `createVersionGatedFetch()`, `onUpdateRequired()` |
| `@fcalell/plugin-expo/version-gate` | `versionGate()`, `VersionGateOptions`, `CLIENT_BUILD_HEADER`, `CLIENT_PLATFORM_HEADER` |

## License

MIT
