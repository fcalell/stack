import { expoClient } from "@better-auth/expo/client";
import { createAuthClient as createBetterAuthClient } from "better-auth/react";
import { createContext, type ReactNode, useContext } from "react";

// Derive the secure-storage shape from `expoClient`'s own option so we stay in
// lockstep with `@better-auth/expo` without importing `expo-secure-store` here
// (which would pull native modules into every importer, including Node tests).
type ExpoClientStorage = NonNullable<
	Parameters<typeof expoClient>[0]
>["storage"];

export interface AuthClientConfig {
	// Base URL of the Better Auth worker (e.g. https://api.example.com).
	baseURL: string;
	// Deep-link scheme for the OAuth redirect back into the app. Matches the
	// Expo app `scheme` (and `plugin-expo`'s `scheme` option).
	scheme: string;
	// Secure key-value store tokens are persisted in. The module flows from
	// `plugin-expo.slots.nativeSecureStorageAdapter` (default `expo-secure-store`);
	// the consumer passes the imported module so this layer stays storage-agnostic.
	storage: ExpoClientStorage;
	// Prefix for stored keys. Defaults to the scheme.
	storagePrefix?: string;
}

export function createAuthClient(config: AuthClientConfig) {
	return createBetterAuthClient({
		baseURL: config.baseURL,
		plugins: [
			expoClient({
				scheme: config.scheme,
				storagePrefix: config.storagePrefix ?? config.scheme,
				storage: config.storage,
			}),
		],
	});
}

export type AuthClient = ReturnType<typeof createAuthClient>;

const AuthClientContext = createContext<AuthClient | null>(null);

export interface AuthProviderProps {
	client: AuthClient;
	children: ReactNode;
}

// Exposes the configured auth client to the tree so screens read it via
// `useAuthClient()` rather than importing a module singleton. Contributed to
// `plugin-expo.slots.providers` by `plugin-native-ui`.
export function AuthProvider(props: AuthProviderProps) {
	return (
		<AuthClientContext.Provider value={props.client}>
			{props.children}
		</AuthClientContext.Provider>
	);
}

export function useAuthClient(): AuthClient {
	const client = useContext(AuthClientContext);
	if (!client) {
		throw new Error("useAuthClient must be used within <AuthProvider>.");
	}
	return client;
}

export interface SocialSignInOptions {
	// In-app path to land on once the OAuth redirect completes.
	callbackURL?: string;
}

// WeNauti (and any OAuth-only native consumer) signs in exclusively through
// Apple + Google; these wrap `signIn.social` so screens don't repeat the
// provider string. The server decides which providers are actually configured.
export function signInWithApple(
	client: AuthClient,
	options?: SocialSignInOptions,
) {
	return client.signIn.social({
		provider: "apple",
		callbackURL: options?.callbackURL,
	});
}

export function signInWithGoogle(
	client: AuthClient,
	options?: SocialSignInOptions,
) {
	return client.signIn.social({
		provider: "google",
		callbackURL: options?.callbackURL,
	});
}
