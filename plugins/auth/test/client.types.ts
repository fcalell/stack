import { createAuthClient } from "../src/client.ts";

// `tsc` runs over this file in `pnpm check`: each `@ts-expect-error` line must
// be an error, so a client whose type keeps a plugin it was not configured
// with fails the check. Never run (better-auth's client is a Proxy, so every
// path exists at runtime).

const access = {
	statements: { project: ["read", "update"] },
	roles: {
		owner: { project: ["read", "update"] },
		editor: { project: ["read"] },
	},
} as const;

// The organization methods take the configured roles, and better-auth's
// default `member` is not one of them.
export function configuredRoles() {
	const client = createAuthClient({ organization: access });
	void client.organization.inviteMember({
		email: "a@example.com",
		role: "editor",
	});
	void client.organization.updateMemberRole({
		memberId: "m1",
		role: "owner",
	});
	void client.organization.inviteMember({
		email: "a@example.com",
		// @ts-expect-error `member` is not a configured role
		role: "member",
	});
}

// Each flag adds its methods to the type, and only with the flag on.
export function flags() {
	const organization = createAuthClient({ organization: true });
	void organization.organization.create;
	void organization.organization.acceptInvitation;
	void organization.useSession;
	const noOrganization = createAuthClient({ organization: false });
	// @ts-expect-error the organization plugin is off
	void noOrganization.organization;

	const magicLink = createAuthClient({ magicLink: true });
	void magicLink.signIn.magicLink;
	void magicLink.magicLink.verify;
	const noMagicLink = createAuthClient({});
	// @ts-expect-error the magic-link plugin is off
	void noMagicLink.signIn.magicLink;

	const mcp = createAuthClient({ organization: true, mcp: true });
	void mcp.oauth2.consent;
	void mcp.oauth2.continue;
	void mcp.oauth2.publicClient;
	void mcp.organization.setActive;
	const noMcp = createAuthClient({ organization: true });
	// @ts-expect-error the OAuth provider client is off
	void noMcp.oauth2;
}
