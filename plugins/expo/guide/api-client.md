# The phone's API client

`src/lib/api.ts` is the phone app's typed client for the worker's procedures. `stack init` (or
`stack add expo`) writes it once and it is yours from then on; queries, mutations and cache
invalidation work as on the web (`node_modules/@fcalell/plugin-api/guide/client.md`).

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

A screen imports `orpc` from it:

```tsx
const query = useQuery(orpc.projects.list.queryOptions({ input: { organizationId } }));
```

## The URL

Set `EXPO_PUBLIC_API_URL` in `.env` to the deployed worker's origin. Unset, the client calls
`http://localhost:8787`, the local worker under `stack dev`. A physical device or an Android
emulator has its own `localhost`, so set the variable to an address it reaches (the machine's LAN
address) while developing on one. Expo inlines `EXPO_PUBLIC_*` variables into the bundle at
build time: never put a secret in one.

## The version headers

`createVersionGatedFetch()` stamps the build number and platform on every request, whether or
not a floor is set, so the [version gate](./version-gate.md) can turn on later without a client
release. `@fcalell/plugin-expo/client` exports:

| Export | What it does |
| --- | --- |
| `versionHeaders()` | The two headers, read from `expo-application`'s `nativeBuildVersion` and `Platform.OS`; `{}` when either is unknown. Never throws. |
| `createVersionGatedFetch(base?)` | Wraps `fetch` (the global unless given): merges the headers into each request's own and signals `onUpdateRequired` subscribers on a `426`. |
| `onUpdateRequired(cb)` | Subscribes to the `426` signal; returns the unsubscribe function. |

The update wall itself is the app's screen: subscribe with `onUpdateRequired` where the app
decides how to show it, and route there.

```tsx
useEffect(() => onUpdateRequired(() => router.replace("/update")), []);
```

## Without `nativeUi()`

`nativeUi()` installs `@tanstack/react-query` and `@orpc/tanstack-query` and wraps the app in the
`QueryProvider` the hooks need. An app on `expo()` alone installs both and mounts the provider
itself.
