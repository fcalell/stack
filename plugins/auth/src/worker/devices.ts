import { apiKey } from "@better-auth/api-key";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";

// Device credentials are Better Auth's API keys, read from the standard
// `Authorization: Bearer` header and standing in for the member's session.
// The plugin validates a key on every call that carries one (a procedure's
// session lookup, the `/ws` upgrade's `get-session`, a service route's), so
// a revoked, disabled or expired key stops working on its next request.

// Every key starts with this, so a bearer that is not a device key (an
// expo session token, an OAuth access token) is never mistaken for one.
export const DEVICE_KEY_PREFIX = "stk_";

// The random characters after the prefix: 48 letters, about 285 bits.
const KEY_LENGTH = 48;

// Calls one key may make in a window, enforced in the database row, so it
// holds on Node as on Cloudflare. Pinned, not options: a daemon that batches
// stays far under it, and one that loops is the case it exists for.
const RATE_LIMIT = { timeWindow: 60_000, maxRequests: 600 };

// Longest name a member can give a device, and the most devices one member
// holds at once.
export const DEVICE_NAME_MAX = 40;
export const DEVICES_MAX = 25;

// Furthest a key's expiry may be set, in days; a key made without one does
// not expire.
export const DEVICE_EXPIRES_MAX_DAYS = 365;

const BEARER = new RegExp(`^bearer\\s+(${DEVICE_KEY_PREFIX}\\S+)$`, "i");

// The device key the request carries, or null. Anything else in the header is
// not ours and is left to the plugins that read it.
export function deviceCredential(
	headers: Headers | undefined | null,
): string | null {
	const value = headers?.get("authorization")?.trim();
	return (value && BEARER.exec(value)?.[1]) || null;
}

// What a device key may reach on the auth routes: the session lookup and the
// reads that say which organizations its member belongs to. Everything else
// (credentials, accounts, sessions, sign-in, deletion, every organization
// write) needs a person's own session, so a stolen key cannot mint another
// key, change the member's sign-in or outlive its revocation. A closed list,
// so an endpoint a later plugin adds is refused until it is named here.
// Procedures of the app are not auth routes and are bounded by their own
// checks.
const DEVICE_ENDPOINTS = new Set([
	"/get-session",
	"/organization/list",
	"/organization/get-full-organization",
	"/organization/get-active-member",
	"/organization/list-members",
	"/organization/has-permission",
]);

export const DEVICE_REFUSED = "DEVICE_CREDENTIAL_REFUSED";

// The routes `devices` takes off HTTP: the plugin's key routes. The
// `auth.devices` procedures call them on the server API, where the name,
// count and expiry limits are enforced; over HTTP those limits would be
// bypassed.
export const DEVICE_DISABLED_PATHS = [
	"/api-key/create",
	"/api-key/delete",
	"/api-key/delete-all-expired-api-keys",
	"/api-key/get",
	"/api-key/list",
	"/api-key/update",
	"/api-key/verify",
];

// Registered before the key plugin, so it refuses before a key is spent.
const guard: BetterAuthPlugin = {
	id: "device-guard",
	hooks: {
		before: [
			{
				matcher: (ctx) =>
					deviceCredential(ctx.headers) !== null &&
					!DEVICE_ENDPOINTS.has(ctx.path ?? ""),
				handler: createAuthMiddleware(async () => {
					throw new APIError("FORBIDDEN", {
						code: DEVICE_REFUSED,
						message: "A device credential cannot call this endpoint.",
					});
				}),
			},
		],
	},
};

export function devicePlugins(): BetterAuthPlugin[] {
	return [
		guard,
		apiKey({
			defaultPrefix: DEVICE_KEY_PREFIX,
			defaultKeyLength: KEY_LENGTH,
			requireName: true,
			maximumNameLength: DEVICE_NAME_MAX,
			enableMetadata: false,
			// The key stands in for the session on `get-session`.
			enableSessionForAPIKeys: true,
			customAPIKeyGetter: (ctx) => deviceCredential(ctx.headers),
			rateLimit: { enabled: true, ...RATE_LIMIT },
			keyExpiration: {
				defaultExpiresIn: null,
				minExpiresIn: 1,
				maxExpiresIn: DEVICE_EXPIRES_MAX_DAYS,
			},
		}),
	];
}
