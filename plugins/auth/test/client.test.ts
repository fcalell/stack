import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuthClient } from "../src/client.ts";

test("the organization flag adds the organization methods", () => {
	const client = createAuthClient({
		passkey: false,
		emailOtp: true,
		organization: true,
	});
	assert.equal(typeof client.organization.create, "function");
	assert.equal(typeof client.organization.acceptInvitation, "function");
	assert.equal(typeof client.useSession, "function");
});

test("without the flag the organization methods are absent from the type", () => {
	const client = createAuthClient({
		passkey: false,
		emailOtp: true,
		organization: false,
	});
	// @ts-expect-error the organization plugin is off
	assert.ok(client.organization);
});

// The consumer's access control as its web client passes it.
const access = {
	statements: { project: ["read", "update"] },
	roles: {
		owner: { project: ["read", "update"] },
		editor: { project: ["read"] },
	},
} as const;

// Checked by the package's type-check and never run: the organization
// methods take the configured roles, and better-auth's default `member` is
// not one of them.
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

test("the configured access control builds the organization methods", () => {
	const client = createAuthClient({ organization: access });
	assert.equal(typeof client.organization.inviteMember, "function");
	assert.equal(typeof client.organization.checkRolePermission, "function");
	assert.equal(
		client.organization.checkRolePermission({
			role: "editor",
			permissions: { project: ["read"] },
		}),
		true,
	);
	assert.equal(
		client.organization.checkRolePermission({
			role: "editor",
			permissions: { project: ["update"] },
		}),
		false,
	);
});

test("the magic link flag adds signIn.magicLink", () => {
	const on = createAuthClient({ magicLink: true });
	assert.equal(typeof on.signIn.magicLink, "function");
	assert.equal(typeof on.magicLink.verify, "function");
	const off = createAuthClient({});
	// @ts-expect-error the magic-link plugin is off
	assert.ok(off.signIn.magicLink);
});
