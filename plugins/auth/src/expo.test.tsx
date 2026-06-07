import { beforeEach, describe, expect, it, vi } from "vitest";

// `@better-auth/expo/client` may pull Expo native modules at import time; stub
// it so the suite runs in plain Node. We assert our own wiring, not Expo's.
vi.mock("@better-auth/expo/client", () => ({
	expoClient: (options: unknown) => ({ id: "expo", options }),
}));

// The native sign-in helpers dynamically import these build-time modules; stub
// them so we can assert the ID token is forwarded to `signIn.social` without a
// device.
vi.mock("@react-native-google-signin/google-signin", () => ({
	GoogleSignin: {
		configure: vi.fn(),
		hasPlayServices: vi.fn().mockResolvedValue(true),
		signIn: vi
			.fn()
			.mockResolvedValue({ type: "success", data: { idToken: "g-id-token" } }),
	},
	isSuccessResponse: (r: { type: string }) => r.type === "success",
}));

vi.mock("expo-apple-authentication", () => ({
	isAvailableAsync: vi.fn().mockResolvedValue(true),
	signInAsync: vi.fn().mockResolvedValue({
		identityToken: "a-id-token",
		fullName: { givenName: "Mario", familyName: "Rossi" },
		email: "mario@example.com",
	}),
	AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

import {
	type AuthClient,
	createAuthClient,
	signInWithApple,
	signInWithAppleNative,
	signInWithGoogle,
	signInWithGoogleNative,
} from "./expo";

describe("createAuthClient", () => {
	it("builds a client exposing social sign-in", () => {
		const client = createAuthClient({
			baseURL: "https://api.test",
			scheme: "wenauti",
			storage: {} as never,
		});
		expect(typeof client.signIn.social).toBe("function");
	});
});

describe("social sign-in helpers", () => {
	function fakeClient() {
		const social = vi.fn().mockResolvedValue({ data: {}, error: null });
		const client = { signIn: { social } } as unknown as AuthClient;
		return { client, social };
	}

	it("signInWithApple forwards the apple provider and callbackURL", async () => {
		const { client, social } = fakeClient();
		await signInWithApple(client, { callbackURL: "/oggi" });
		expect(social).toHaveBeenCalledWith({
			provider: "apple",
			callbackURL: "/oggi",
		});
	});

	it("signInWithGoogle forwards the google provider", async () => {
		const { client, social } = fakeClient();
		await signInWithGoogle(client);
		expect(social).toHaveBeenCalledWith({
			provider: "google",
			callbackURL: undefined,
		});
	});
});

describe("native ID-token sign-in helpers", () => {
	// Clear call history between tests; the native module mocks are shared, so
	// call counts would otherwise leak across cases (implementations survive).
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function fakeClient() {
		const social = vi.fn().mockResolvedValue({ data: {}, error: null });
		const client = { signIn: { social } } as unknown as AuthClient;
		return { client, social };
	}

	it("signInWithGoogleNative forwards the SDK id token", async () => {
		const { client, social } = fakeClient();
		await signInWithGoogleNative(client, { webClientId: "web.apps" });
		expect(social).toHaveBeenCalledWith({
			provider: "google",
			idToken: { token: "g-id-token" },
		});
	});

	it("signInWithGoogleNative throws when the SDK returns no id token", async () => {
		const { GoogleSignin } = await import(
			"@react-native-google-signin/google-signin"
		);
		vi.mocked(GoogleSignin.signIn).mockResolvedValueOnce({
			type: "success",
			data: { idToken: null },
		} as never);
		const { client } = fakeClient();
		await expect(
			signInWithGoogleNative(client, { webClientId: "web.apps" }),
		).rejects.toThrow("no id token");
	});

	it("signInWithAppleNative forwards the identity token, nonce, and first-run profile", async () => {
		const { client, social } = fakeClient();
		await signInWithAppleNative(client, { nonce: "n0nce" });
		expect(social).toHaveBeenCalledWith({
			provider: "apple",
			idToken: {
				token: "a-id-token",
				nonce: "n0nce",
				user: {
					name: { firstName: "Mario", lastName: "Rossi" },
					email: "mario@example.com",
				},
			},
		});
	});

	it("signInWithAppleNative falls back to the browser flow when unavailable (Android)", async () => {
		const Apple = await import("expo-apple-authentication");
		vi.mocked(Apple.isAvailableAsync).mockResolvedValueOnce(false);
		const { client, social } = fakeClient();
		await signInWithAppleNative(client);
		expect(social).toHaveBeenCalledWith({ provider: "apple" });
		expect(Apple.signInAsync).not.toHaveBeenCalled();
	});
});
