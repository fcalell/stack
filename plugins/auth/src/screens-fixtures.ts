import type { Fixtures } from "@fcalell/plugin-screens/fixtures";
import { session, user } from "./screens-session.ts";
import type { Device } from "./worker/outputs.ts";
import type {
	deviceProcedures,
	emailOtpProcedures,
	magicLinkProcedures,
	oauthProcedures,
	organizationProcedures,
	sessionProcedures,
} from "./worker/procedures.ts";

// The device keys a member's list shows in the screens workbench: one in use,
// one never used, one that expired, so a list draws each of its forms.
const devices: Device[] = [
	{
		id: "device_studio",
		name: "Studio laptop",
		start: "sk_stud",
		createdAt: new Date("2026-02-10T09:00:00.000Z"),
		expiresAt: null,
		lastUsedAt: new Date("2026-02-28T18:30:00.000Z"),
	},
	{
		id: "device_booth",
		name: "Booth laptop",
		start: "sk_boot",
		createdAt: new Date("2026-02-20T09:00:00.000Z"),
		expiresAt: new Date("2099-01-01T00:00:00.000Z"),
		lastUsedAt: null,
	},
	{
		id: "device_old",
		name: "Old desktop",
		start: "sk_oldd",
		createdAt: new Date("2025-06-01T09:00:00.000Z"),
		expiresAt: new Date("2025-12-01T09:00:00.000Z"),
		lastUsedAt: new Date("2025-11-30T12:00:00.000Z"),
	},
];

const organization = {
	id: "org_screens",
	name: "Studio",
	slug: "studio",
	createdAt: new Date("2026-01-05T09:00:00.000Z"),
	logo: null,
	metadata: undefined,
};

const activeOrganization = { ...organization, members: [], invitations: [] };

// What the screens workbench contributes for the procedures auth owns: the
// signed-in session `orpc.auth.session` reads, so a screen behind the session
// guard draws its signed-in form, and the device keys of `devices: true`
// (`auth.devices.list`, `create`, `revoke`), so a screen that lists, makes and
// revokes them draws each, and the steps a shipped page calls: sign-in and
// sign-out, `user.update`, the organization list, create, delete, `setActive` and
// invitations, and with `mcp: true` the connect pages' `oauth.client`,
// `oauth.consent` and `organization.setActive`. A procedure the app's auth config leaves off is
// never called, so its fixture is inert. The app overrides any of them in
// `src/app/fixtures.ts`, starting from this answer when it only adds to it: the
// tree keeps its own type (`satisfies`, not an annotation), so
// `fixtures.auth.session()` is the signed-in `{ session, user }` itself, with no
// optional or null in the way.
const fixtures = {
	auth: {
		session: () => ({ session, user }),
		// The sign-in steps, answered as a sent code or link and a verified code.
		signIn: {
			sendOtp: () => ({ success: true }),
			verifyOtp: () => ({ token: session.token, user }),
			magicLink: () => ({ status: true }),
		},
		signOut: () => ({ success: true, url: undefined, redirect: undefined }),
		// The client an MCP connect page asks consent for.
		oauth: {
			client: () => ({
				client_id: "client_screens",
				client_name: "Claude",
				client_uri: "https://claude.ai",
			}),
			consent: () => ({ redirect: true, url: "https://example.com/callback" }),
		},
		user: { update: () => ({ status: true }) },
		organization: {
			list: () => [organization],
			setActive: () => activeOrganization,
			create: () => ({ ...activeOrganization, metadata: undefined }),
			delete: () => organization,
			invitations: {
				create: ({ email, role }) => ({
					id: "invitation_screens",
					organizationId: organization.id,
					email,
					role,
					status: "pending" as const,
					inviterId: user.id,
					expiresAt: new Date("2099-01-01T00:00:00.000Z"),
					createdAt: new Date("2026-03-01T09:00:00.000Z"),
				}),
			},
		},
		devices: {
			list: (): Device[] => devices,
			// The one key the answer shows, as the member copies it.
			create: ({ name }) => ({
				device: {
					id: "device_new",
					name,
					start: "sk_scre",
					createdAt: new Date("2026-03-01T09:00:00.000Z"),
					expiresAt: null,
					lastUsedAt: null,
				},
				key: "sk_screens_0123456789abcdefghijklmnopqrstuvwxyz",
			}),
			revoke: () => ({ success: true }),
		},
	},
} satisfies Fixtures<{
	auth: ReturnType<typeof sessionProcedures> &
		ReturnType<typeof deviceProcedures> &
		ReturnType<typeof oauthProcedures> & {
			signIn: ReturnType<typeof emailOtpProcedures> &
				ReturnType<typeof magicLinkProcedures>;
			organization: ReturnType<typeof organizationProcedures>["organization"];
		};
}>;

export default fixtures;
