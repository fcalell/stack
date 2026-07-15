import { describe, expect, it } from "vitest";
import { invitation, member, organization } from "./organization";

// Same rationale as ./index.test.ts: drift.test.ts guards dataType against
// better-auth's live expectations, not the exact DB column spelling or
// notNull. A drifted column name is a silent runtime failure the first time
// a consumer with `organization: true` hits /organization/create.
describe("Better Auth organization-plugin schema (sqlite)", () => {
	it("maps camelCase fields to snake_case DB columns with the expected notNull", () => {
		expect(organization.slug.name).toBe("slug");
		expect(organization.logo.name).toBe("logo");
		expect(organization.metadata.name).toBe("metadata");
		expect(organization.createdAt.name).toBe("created_at");
		// No cascade FK, matching better-auth's own field def.
		expect(member.organizationId.name).toBe("organization_id");
		expect(member.organizationId.notNull).toBe(true);
		expect(member.userId.name).toBe("user_id");
		expect(member.role.name).toBe("role");
		expect(invitation.organizationId.name).toBe("organization_id");
		expect(invitation.inviterId.name).toBe("inviter_id");
		expect(invitation.email.name).toBe("email");
		expect(invitation.status.name).toBe("status");
		expect(invitation.expiresAt.name).toBe("expires_at");
	});
});
