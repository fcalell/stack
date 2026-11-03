import type { NodeWorker } from "./create-node-server.ts";
import type { ConnectionSession } from "./ws-hub.ts";

// plugin-auth mounts better-auth under this worker path (its `AUTH_PREFIX`).
// This package cannot import plugin-auth, so, as plugin-expo's version gate
// does, it names the path: the auth plugin is configured exactly when the
// worker owns it.
const AUTH_PREFIX = "/api/auth";

// plugin-auth publishes `{ sessionId }` here when Better Auth deletes a
// session (a sign-out, a revoke, a deleted user), named here for the same
// reason as the prefix: the server closes that session's sockets.
export const SESSION_ENDED_CHANNEL = "stack:auth:session-ended";

export function hasAuth(workerPaths: readonly string[]): boolean {
	return workerPaths.includes(AUTH_PREFIX);
}

export type WsUpgradeDecision =
	| { allow: true; session: ConnectionSession | null }
	| { allow: false; reason: "origin" | "session" };

// The whole admission rule, apart from how its inputs are found. A browser
// applies no CORS to a WebSocket and sends its Origin, so a page open beside
// the app opens a socket with the user's cookies: an upgrade must name the
// page it comes from, and an Origin the app does not trust is refused first
// (a native client's WebSocket sends one too). The one upgrade with no Origin
// admitted is a headless client's (a daemon holding a device key), which
// carries its credential as `Authorization: Bearer`, a header no browser page
// can set on a WebSocket; it is judged by that credential alone, its cookies
// unread. The session comes next, which an app with auth requires of every
// socket.
export function wsUpgradeDecision(input: {
	origin: string | null;
	originAllowed: boolean;
	bearer: boolean;
	authConfigured: boolean;
	session: ConnectionSession | null;
}): WsUpgradeDecision {
	const named =
		input.origin === null
			? input.bearer && input.authConfigured
			: input.originAllowed;
	if (!named) return { allow: false, reason: "origin" };
	if (input.authConfigured && input.session === null) {
		return { allow: false, reason: "session" };
	}
	return { allow: true, session: input.session };
}

// Whether the worker's CORS layer answers `origin`: a preflight through
// `worker.fetch` reads the same effective list the worker's own
// `isForbiddenOrigin` guard does (production origins, plus the dev origins
// only under STACK_DEV), so no second list exists to drift. A worker with
// no CORS, or none at all, trusts no browser origin.
export async function workerAllowsOrigin(
	worker: NodeWorker | null,
	env: unknown,
	url: URL,
	origin: string,
): Promise<boolean> {
	if (!worker) return false;
	try {
		const response = await worker.fetch(
			new Request(url, {
				method: "OPTIONS",
				headers: {
					origin,
					"access-control-request-method": "GET",
				},
			}),
			env,
			undefined,
		);
		const allowed = response.headers.get("access-control-allow-origin");
		return allowed === "*" || allowed === origin;
	} catch {
		return false;
	}
}

// The session the request's credentials hold, asked of the same auth the
// RPC calls resolve it from (better-auth's `get-session`, answered by the
// worker), from the database rather than the signed cookie cache, so a
// session revoked a moment ago opens nothing. Anything but a session is
// null: an error refuses the socket. `credentials` names the request headers
// it forwards.
export async function workerSession(
	worker: NodeWorker | null,
	env: unknown,
	request: Request,
	credentials: readonly string[] = ["cookie", "authorization"],
): Promise<ConnectionSession | null> {
	if (!worker) return null;
	const headers = new Headers({ accept: "application/json" });
	for (const name of credentials) {
		const value = request.headers.get(name);
		if (value !== null) headers.set(name, value);
	}
	try {
		const response = await worker.fetch(
			new Request(
				new URL(
					`${AUTH_PREFIX}/get-session?disableCookieCache=true`,
					request.url,
				),
				{
					headers,
				},
			),
			env,
			undefined,
		);
		if (!response.ok) return null;
		const body: unknown = await response.json();
		if (!isRecord(body) || !isRecord(body.user) || !isRecord(body.session)) {
			return null;
		}
		return { user: body.user, session: body.session };
	} catch {
		return null;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Whether the request's Origin is one of the app's pages: on a listener that
// serves one origin of its own, that origin alone; on the main one, an origin
// the worker's CORS list trusts. Null when the request sends none.
async function trustedOrigin(options: {
	worker: NodeWorker | null;
	env: unknown;
	listenerOrigin: string | null;
	request: Request;
}): Promise<boolean | null> {
	const { worker, env, listenerOrigin, request } = options;
	const origin = request.headers.get("origin");
	if (origin === null) return null;
	if (listenerOrigin !== null) return origin === listenerOrigin;
	return workerAllowsOrigin(worker, env, new URL(request.url), origin);
}

const BEARER_ONLY = ["authorization"] as const;
const EVERY_CREDENTIAL = ["cookie", "authorization"] as const;
// The methods a browser reads with and sends no Origin on from the app's own
// page (an image, a link, a download): a route answers them without changing
// state, so a cookie on one opens nothing a page elsewhere can use.
const READS = new Set(["GET", "HEAD"]);

// Admits or refuses a `/ws` upgrade request: the origin first, so a
// cross-site page never makes the worker look a session up. With no Origin,
// only a bearer credential is read.
export async function authorizeUpgrade(options: {
	worker: NodeWorker | null;
	env: unknown;
	listenerOrigin: string | null;
	authConfigured: boolean;
	request: Request;
}): Promise<WsUpgradeDecision> {
	const { worker, env, authConfigured, request } = options;
	const origin = request.headers.get("origin");
	const bearer = /^bearer\s/i.test(request.headers.get("authorization") ?? "");
	const originAllowed = (await trustedOrigin(options)) === true;
	const named = origin === null ? bearer : originAllowed;
	const session =
		named && authConfigured
			? await workerSession(
					worker,
					env,
					request,
					origin === null ? BEARER_ONLY : EVERY_CREDENTIAL,
				)
			: null;
	return wsUpgradeDecision({
		origin,
		originAllowed,
		bearer,
		authConfigured,
		session,
	});
}

// The session a mounted route's request holds, by `/ws`'s rule for the one
// credential a browser attaches by itself: its cookies are read only when the
// request comes from one of the app's pages, an Origin it trusts, or a read
// with no Origin (a browser sends one on every cross-origin request and on a
// same-origin one that changes state). A bearer key, which no page holds, is
// read on any request. So a page elsewhere that posts to a route with the
// user's cookies is anonymous, and the route needs no Origin check of its own.
export async function mountSession(options: {
	worker: NodeWorker | null;
	env: unknown;
	listenerOrigin: string | null;
	request: Request;
}): Promise<ConnectionSession | null> {
	const { worker, env, request } = options;
	const trusted = await trustedOrigin(options);
	const cookies =
		trusted === true || (trusted === null && READS.has(request.method));
	return workerSession(
		worker,
		env,
		request,
		cookies ? EVERY_CREDENTIAL : BEARER_ONLY,
	);
}
