// What a layout under `SessionBoundary` does with the session state:
// better-auth's Solid client reports `isPending` until its first answer.
export interface SessionState {
	data: unknown;
	isPending: boolean;
}

export type SessionGate =
	| { kind: "wait" }
	| { kind: "render" }
	| { kind: "signIn"; href: string };

// `from` is the address the viewer asked for; the sign-in page reads it back
// from `redirect` to return there.
export function sessionGate(
	state: SessionState,
	signIn: string,
	from: string,
): SessionGate {
	if (state.data) return { kind: "render" };
	if (state.isPending) return { kind: "wait" };
	return {
		kind: "signIn",
		href: `${signIn}?redirect=${encodeURIComponent(from)}`,
	};
}
