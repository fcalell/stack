import { describe, expect, it } from "vitest";
import { account, session, user, verification } from "./schema";

// The Drizzle adapter resolves Better Auth's models against these columns by
// name and reads/writes dates + booleans via the column mode. A drifted column
// name or mode is a silent runtime failure (sessions never expire, sign-in
// writes the wrong column), so guard the shape the adapter depends on.
describe("Better Auth core schema (sqlite)", () => {
	it("defines the four identity tables", () => {
		for (const table of [user, session, account, verification]) {
			expect(table).toBeDefined();
		}
	});

	it("maps user columns to the expected snake_case names + modes", () => {
		expect(user.id.name).toBe("id");
		expect(user.email.name).toBe("email");
		expect(user.emailVerified.name).toBe("email_verified");
		expect(user.image.name).toBe("image");
		expect(user.createdAt.name).toBe("created_at");
		expect(user.updatedAt.name).toBe("updated_at");
		// Boolean + date JS modes the adapter relies on (mode drift = silent bugs).
		expect(user.emailVerified.dataType).toBe("boolean");
		expect(user.createdAt.dataType).toBe("date");
	});

	it("links session + account to user and carries the OAuth token columns", () => {
		expect(session.userId.name).toBe("user_id");
		expect(session.token.name).toBe("token");
		expect(session.expiresAt.name).toBe("expires_at");
		expect(account.userId.name).toBe("user_id");
		expect(account.providerId.name).toBe("provider_id");
		expect(account.accountId.name).toBe("account_id");
		expect(account.idToken.name).toBe("id_token");
		expect(account.accessToken.name).toBe("access_token");
	});

	it("keeps the verification table (OAuth state / PKCE) even OAuth-only", () => {
		expect(verification.identifier.name).toBe("identifier");
		expect(verification.value.name).toBe("value");
		expect(verification.expiresAt.name).toBe("expires_at");
	});
});
