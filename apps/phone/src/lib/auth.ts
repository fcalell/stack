import { type AuthClient, createAuthClient } from "@fcalell/plugin-auth/expo";
import * as SecureStore from "expo-secure-store";
import { cookiePrefix, scheme } from "../../.stack/native-auth";

// The native auth client wired into the app by `<AuthProvider>` (see the
// generated `.stack/entry.tsx`). `scheme` and `cookiePrefix` come from the
// generated `.stack/native-auth.ts`, so they always match the deep-link
// scheme expo bakes into the app config and the worker's session-cookie
// prefix. The one value to set by hand is the deployed API worker's URL:
// EXPO_PUBLIC_API_URL in `.env`
// (https://docs.expo.dev/guides/environment-variables/). The localhost
// fallback targets the local worker during development.
export const authClient: AuthClient = createAuthClient({
	baseURL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787",
	scheme,
	cookiePrefix,
	storage: SecureStore,
});
