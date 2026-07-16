import { createClient } from "@fcalell/plugin-api/client";
import { createApiQueryUtils } from "@fcalell/plugin-api/tanstack-query";
import { createVersionGatedFetch } from "@fcalell/plugin-expo/client";
// The emitted worker's router type, imported type-only so no worker code
// (or its Node/Workers-only dependencies) enters the app bundle.
import type { AppRouter } from "../../.stack/worker";

// The typed RPC client wired into the app. One value is app-specific:
//
//   • url — your deployed API worker. Set EXPO_PUBLIC_API_URL in `.env`
//     (https://docs.expo.dev/guides/environment-variables/). The localhost
//     fallback targets the local worker during development.
//
// `fetch` stamps the native build number + platform on every request
// (`@fcalell/plugin-expo/client`'s `versionHeaders()`) so a
// `minNativeBuild` floor (WS4) can wall this
// build with 426 Upgrade Required. Subscribe to `onUpdateRequired` from the
// same module to render an update-wall screen when that happens; this
// client only carries the signal.
const client = createClient<AppRouter>({
	url: `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787"}/rpc`,
	fetch: createVersionGatedFetch(),
});

export const orpc = createApiQueryUtils(client);
