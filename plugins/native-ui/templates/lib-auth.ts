import { type AuthClient, createAuthClient } from "@fcalell/plugin-auth/expo";
import * as SecureStore from "expo-secure-store";

// The native auth client wired into the app by `<AuthProvider>` (see the
// generated `.stack/entry.tsx`). Two values are app-specific:
//
//   • baseURL — your deployed API worker. Set EXPO_PUBLIC_API_URL in `.env`
//     (https://docs.expo.dev/guides/environment-variables/). The localhost
//     fallback targets the local worker during development.
//   • scheme  — must match the deep-link `scheme` in your `app.config.ts`, so
//     the OAuth redirect lands back in the app.
export const authClient: AuthClient = createAuthClient({
	baseURL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787",
	scheme: "app",
	storage: SecureStore,
});
