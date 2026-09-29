import type { QueryClient } from "@tanstack/solid-query";

// What a layout under `SessionBoundary` does with the session state:
// better-auth's Solid client reports `isPending` until its first answer, a
// `null` body when nobody is signed in, and `error` when the check itself
// failed.
export interface SessionState {
	data: unknown;
	isPending: boolean;
	error: { status: number } | null;
	refetch: () => unknown;
}

export type SessionGate =
	| { kind: "wait" }
	| { kind: "render" }
	| { kind: "failed" }
	| { kind: "signIn"; href: string };

// A session is better-auth's shape, a `session` and a `user` object; any
// other body is not one, however truthy.
function isSession(data: unknown): boolean {
	if (typeof data !== "object" || data === null) return false;
	const { session, user } = data as { session?: unknown; user?: unknown };
	return (
		typeof session === "object" &&
		session !== null &&
		typeof user === "object" &&
		user !== null
	);
}

// `from` is the address the viewer asked for; the sign-in page reads it back
// from `redirect` to return there. Only an answer that says nobody is signed
// in sends there: a 401, or no body and no error. A check that failed any
// other way, or answered with something that is no session, is a failure
// the viewer can retry, never a sign-in.
export function sessionGate(
	state: SessionState,
	signIn: string,
	from: string,
): SessionGate {
	if (isSession(state.data)) return { kind: "render" };
	if (state.isPending) return { kind: "wait" };
	if (state.error && state.error.status !== 401) return { kind: "failed" };
	if (!state.error && state.data !== null && state.data !== undefined)
		return { kind: "failed" };
	return {
		kind: "signIn",
		href: `${signIn}?redirect=${encodeURIComponent(from)}`,
	};
}

// A request refused for want of a session: the api's `UNAUTHORIZED`, a 401.
// Under a `SessionBoundary` it says the session ended (a sign-out, an expiry,
// another tab), which the guard answers with the sign-in, never an error to
// draw. A request refused for want of a permission is `FORBIDDEN`, a 403.
export function isUnauthorized(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const { status, code } = error as { status?: unknown; code?: unknown };
	return status === 401 || code === "UNAUTHORIZED";
}

// What the guard does with an error its layout threw. A 401 re-asks the
// session: once the answer says nobody is signed in, the gate sends to the
// sign-in; while a session still stands, the refusal was no sign-out and
// goes on to the app's error boundary. Any other error goes there at once.
export async function settleRefusal(
	error: unknown,
	session: () => SessionState,
): Promise<"signIn" | "rethrow"> {
	if (!isUnauthorized(error)) return "rethrow";
	await session().refetch();
	return isSession(session().data) ? "rethrow" : "signIn";
}

// The signed-in user's id, or null when the answer holds no session.
export function viewerOf(data: unknown): string | null {
	if (!isSession(data)) return null;
	const id = (data as { user: { id?: unknown } }).user.id;
	return typeof id === "string" ? id : null;
}

// Who the next session answer leaves signed in, and who it signed out: the
// held viewer stays while the answer is pending or failed, goes when the
// answer says nobody is signed in, and is replaced when another user's
// session answers (another tab signed in as someone else). What a viewer
// who signed out left behind, their last scope, is forgotten.
export function nextViewer(
	held: string | null,
	state: SessionState,
): { viewer: string | null; signedOut: string | null } {
	const id = viewerOf(state.data);
	if (id !== null)
		return {
			viewer: id,
			signedOut: held !== null && held !== id ? held : null,
		};
	if (sessionGate(state, "", "").kind === "signIn")
		return { viewer: null, signedOut: held };
	return { viewer: held, signedOut: null };
}

// The viewer each query client's cache was last read for.
const cacheViewer = new WeakMap<QueryClient, string | null>();

// Gives `client`'s cache to `viewer` before anything reads it: a viewer other
// than the one it was last read for starts from an empty cache, so no answer
// the server gave one viewer (their organizations, their role's rules) is
// read by another. It is kept per client, never per boundary, since the
// sign-in between two viewers happens outside the guarded layout, which
// mounts afresh for the next; the same viewer signing back in keeps their
// cache.
export function claimCache(client: QueryClient, viewer: string | null): void {
	if (cacheViewer.has(client) && cacheViewer.get(client) !== viewer)
		client.clear();
	cacheViewer.set(client, viewer);
}
