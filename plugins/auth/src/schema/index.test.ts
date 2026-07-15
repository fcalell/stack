import { describe, expect, it } from "vitest";
import { account, session, user, verification } from "./index";

// The Drizzle adapter resolves Better Auth's models against these columns by
// name. drift.test.ts guards dataType/mode against better-auth's live
// expectations; it doesn't check the exact DB column spelling or notNull, so
// pin those here. A drifted column name is a silent runtime failure (sessions
// never expire, sign-in writes the wrong column).
describe("Better Auth core schema (sqlite)", () => {
	it("maps camelCase fields to snake_case DB columns with the expected notNull", () => {
		expect(user.emailVerified.name).toBe("email_verified");
		expect(user.createdAt.name).toBe("created_at");
		expect(user.updatedAt.name).toBe("updated_at");
		expect(session.userId.name).toBe("user_id");
		expect(session.expiresAt.name).toBe("expires_at");
		expect(account.userId.name).toBe("user_id");
		expect(account.providerId.name).toBe("provider_id");
		expect(account.accountId.name).toBe("account_id");
		expect(account.idToken.name).toBe("id_token");
		expect(account.accessToken.name).toBe("access_token");
		expect(verification.expiresAt.name).toBe("expires_at");
		// WS2.4: `organization` adds this to `session` (better-auth's own field,
		// not a new table), nullable so it's a no-op when never enabled.
		expect(session.activeOrganizationId.name).toBe("active_organization_id");
		expect(session.activeOrganizationId.notNull).toBe(false);
	});
});
