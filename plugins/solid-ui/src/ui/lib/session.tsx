import { Navigate, useLocation } from "@solidjs/router";
import { type Accessor, type JSX, Match, Switch } from "solid-js";
import { type SessionState, sessionGate } from "#lib/session-gate.ts";

export interface SessionBoundaryProps {
	// `authClient.useSession()` from the generated `.stack/auth-client.ts`.
	session: Accessor<SessionState>;
	// Where a viewer without a session goes; the address they asked for rides
	// along as `redirect`.
	signIn: string;
	children: JSX.Element;
}

// Guards a layout: its children render only with a session. While the first
// session answer is pending it draws nothing, since the canvas under it is
// the whole screen for that one request.
export function SessionBoundary(props: SessionBoundaryProps) {
	const location = useLocation();
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
	return (
		<Switch>
			<Match when={gate().kind === "render"}>{props.children}</Match>
			<Match when={signInHref()}>{(href) => <Navigate href={href()} />}</Match>
		</Switch>
	);
}
