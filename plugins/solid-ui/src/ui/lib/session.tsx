import { Navigate, useLocation } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import {
	type Accessor,
	createContext,
	createEffect,
	createMemo,
	createSignal,
	ErrorBoundary,
	type JSX,
	Match,
	Switch,
	useContext,
} from "solid-js";
import { forgetScope } from "#lib/scope-lookup.ts";
import {
	claimCache,
	isUnauthorized,
	nextViewer,
	type SessionState,
	sessionGate,
	settleRefusal,
} from "#lib/session-gate.ts";
import { useWords } from "#lib/words.tsx";
import { EmptyState } from "../components/empty-state/index.tsx";

export interface SessionBoundaryProps {
	// `authClient.useSession()` from the generated `.stack/auth-client.ts`.
	session: Accessor<SessionState>;
	// Where a viewer without a session goes; the address they asked for rides
	// along as `redirect`.
	signIn: string;
	// What the viewer reads when the session check itself failed.
	sentence: string;
	children: JSX.Element;
}

// The signed-in user's id, for what the app keeps per viewer in the browser
// (the last scope a `ScopeBoundary` resolved).
const Viewer = createContext<Accessor<string | null>>();

// The signed-in user's id under a `SessionBoundary`; undefined outside one.
export function useViewer(): Accessor<string | null> | undefined {
	return useContext(Viewer);
}

// Guards a layout: its children render only with a session. While the first
// session answer is pending it draws nothing, since the canvas under it is
// the whole screen for that one request. A check that failed (a network
// error, a server error, a body that is no session) draws `sentence` with a
// retry act, never the sign-in and never the children. A request its children
// make that the server refuses for want of a session (a sign-out, an expiry,
// another tab's sign-out) re-asks the session, and the gate sends to the
// sign-in; it never reaches the app's error boundary. The signed-in user's id
// is its children's `useViewer()`; when the session ends (a sign-out here, an
// expiry, another tab), the last scope that user left is forgotten. Its
// children render for one viewer: before they first read the query cache it
// is emptied when it was last read for someone else, and a change of viewer
// in place (another tab signing in as someone else) draws them afresh over
// the emptied cache, so no query answered for one viewer is read by another.
export function SessionBoundary(props: SessionBoundaryProps) {
	const words = useWords();
	const location = useLocation();
	const queryClient = useQueryClient();
	const change = createMemo(
		(held: ReturnType<typeof nextViewer>) =>
			nextViewer(held.viewer, props.session()),
		{ viewer: null, signedOut: null },
	);
	const viewer = () => change().viewer;
	createEffect(() => {
		const signedOut = change().signedOut;
		if (signedOut !== null) forgetScope(signedOut);
	});
	const gate = () =>
		sessionGate(
			props.session(),
			props.signIn,
			`${location.pathname}${location.search}`,
		);
	const signInHref = () => {
		const g = gate();
		return g.kind === "signIn" ? g.href : undefined;
	};
	// Who the children render for, a new object only when the viewer changes,
	// so the keyed match below redraws them for a new viewer and never for a
	// session refetch.
	const rendered = createMemo(
		() => {
			if (gate().kind !== "render") return undefined;
			claimCache(queryClient, viewer());
			return { viewer: viewer() };
		},
		undefined,
		{ equals: (a, b) => a?.viewer === b?.viewer },
	);
	return (
		<Switch>
			<Match when={rendered()} keyed>
				{(served) => (
					<Viewer.Provider value={() => served.viewer}>
						<ErrorBoundary
							fallback={(error) => {
								if (!isUnauthorized(error)) throw error;
								return <Refused error={error} session={props.session} />;
							}}
						>
							{props.children}
						</ErrorBoundary>
					</Viewer.Provider>
				)}
			</Match>
			<Match when={gate().kind === "failed"}>
				<EmptyState
					sentence={props.sentence}
					act={{ label: words.retry, onAct: () => props.session().refetch() }}
				/>
			</Match>
			<Match when={signInHref()}>{(href) => <Navigate href={href()} />}</Match>
		</Switch>
	);
}

// Draws nothing while the session is re-asked after a 401: the answer that
// nobody is signed in turns the gate to the sign-in, and a session still
// standing sends the refusal on to the app's error boundary.
function Refused(props: { error: unknown; session: Accessor<SessionState> }) {
	const [rethrow, setRethrow] = createSignal(false);
	void settleRefusal(props.error, props.session).then((outcome) =>
		setRethrow(outcome === "rethrow"),
	);
	createEffect(() => {
		if (rethrow()) throw props.error;
	});
	return null;
}
