import { expoClient } from "@better-auth/expo/client";
import { createAuthClient as createBetterAuthClient } from "better-auth/react";
import type { AppleAuthenticationScope } from "expo-apple-authentication";
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
	// Secure key-value store tokens are persisted in. The consumer passes the
	// imported module (e.g. `expo-secure-store`) so this layer stays
	// storage-agnostic and never pulls native modules into Node-side tests.
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

// ── Native ID-token sign-in ─────────────────────────────────────────
//
// The helpers above open the system browser for the OAuth redirect (works in
// Expo Go). The two below skip the browser: they drive the OS account sheet via
// the platform SDK, then hand the resulting ID token to the worker, which
// verifies it server-side. This is the better UX but pulls in build-time native
// modules — they require a custom dev/native build and are absent from Expo Go.
// The native modules are dynamically imported so merely importing this file (in
// Node tests or a web consumer) never loads them.

export interface NativeGoogleSignInConfig {
	// Google "Web application" OAuth client id. Google issues the native ID token
	// to this audience, so it must equal the worker's GOOGLE_CLIENT_ID for the
	// server to verify it.
	webClientId: string;
	// Google "iOS" OAuth client id (recommended on iOS).
	iosClientId?: string;
	scopes?: string[];
	offlineAccess?: boolean;
}

export async function signInWithGoogleNative(
	client: AuthClient,
	config: NativeGoogleSignInConfig,
) {
	const { GoogleSignin, isSuccessResponse } = await import(
		"@react-native-google-signin/google-signin"
	);
	GoogleSignin.configure({
		webClientId: config.webClientId,
		iosClientId: config.iosClientId,
		scopes: config.scopes,
		offlineAccess: config.offlineAccess,
	});
	// No-op on iOS; on Android it surfaces the Play Services update prompt before
	// the account sheet.
	await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
	const response = await GoogleSignin.signIn();
	if (!isSuccessResponse(response)) {
		throw new Error("Google sign-in was cancelled.");
	}
	const { idToken } = response.data;
	if (!idToken) {
		throw new Error("Google sign-in returned no id token.");
	}
	return client.signIn.social({
		provider: "google",
		idToken: { token: idToken },
	});
}

export interface NativeAppleSignInOptions {
	// Raw nonce bound into the Apple ID token; Better Auth accepts the raw value
	// or its SHA-256 when present. Omit to skip nonce binding.
	nonce?: string;
	requestedScopes?: AppleAuthenticationScope[];
}

export async function signInWithAppleNative(
	client: AuthClient,
	options?: NativeAppleSignInOptions,
) {
	const AppleAuthentication = await import("expo-apple-authentication");
	// Sign in with Apple is iOS-only; on Android fall back to the browser flow so
	// the provider still works cross-platform.
	if (!(await AppleAuthentication.isAvailableAsync())) {
		return client.signIn.social({ provider: "apple" });
	}
	const credential = await AppleAuthentication.signInAsync({
		nonce: options?.nonce,
		requestedScopes: options?.requestedScopes ?? [
			AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
			AppleAuthentication.AppleAuthenticationScope.EMAIL,
		],
	});
	const idToken = credential.identityToken;
	if (!idToken) {
		throw new Error("Apple sign-in returned no identity token.");
	}
	// Apple returns name/email only on the FIRST authorization — forward them so
	// the server can persist them; later sign-ins rely on the ID token `sub`.
	const user =
		credential.fullName || credential.email
			? {
					name: credential.fullName
						? {
								firstName: credential.fullName.givenName ?? undefined,
								lastName: credential.fullName.familyName ?? undefined,
							}
						: undefined,
					email: credential.email ?? undefined,
				}
			: undefined;
	return client.signIn.social({
		provider: "apple",
		idToken: { token: idToken, nonce: options?.nonce, user },
	});
}
