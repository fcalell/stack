import { describe, expect, it, vi } from "vitest";

// `@better-auth/expo/client` may pull Expo native modules at import time; stub
// it so the suite runs in plain Node. We assert our own wiring, not Expo's.
vi.mock("@better-auth/expo/client", () => ({
	expoClient: (options: unknown) => ({ id: "expo", options }),
}));

import {
	type AuthClient,
	createAuthClient,
	signInWithApple,
	signInWithGoogle,
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
