import { fetchScope } from "@fcalell/plugin-api/ability-client";
import type { MemberRow, Scope } from "@fcalell/plugin-auth/scope";
import { useLocation } from "@solidjs/router";
import { useQuery } from "@tanstack/solid-query";
import {
	type Accessor,
	createContext,
	createEffect,
	createMemo,
	createSignal,
	type JSX,
	Match,
	onCleanup,
	Switch,
	useContext,
} from "solid-js";
import {
	addressToRemember,
	boundaryView,
	forgetScope,
	forgetScopeAt,
	lastScope,
	rememberScope,
	scopeLookup,
	scopePath,
	scopeQueryOptions,
} from "#lib/scope-lookup.ts";
import { useViewer } from "#lib/session.tsx";

// The nearest resolved boundary: its chain (each level's row by scope name,
// and the caller's `member` row), its own address, and `claim`, which a
// boundary resolved under it calls so the deepest one is remembered.
interface Resolved {
	entries: Accessor<Record<string, unknown>>;
	path: Accessor<string | null>;
	claim: () => () => void;
}

const ScopeEntries = createContext<Resolved>();

export type ScopeRow<S> =
	S extends Scope<infer N, infer C> ? C[N & keyof C] : never;

export interface ScopeBoundaryProps<S extends Scope> {
	scope: S;
	// The URL's name for the row, usually a route param.
	slug: string;
	// Drawn when no such row exists or the caller is no member: the screen's
	// `EmptyState`, in the consumer's words.
	notFound: JSX.Element;
	// Whether this address is where `/` may return the viewer; true unless
	// the route is a pass (an onboarding step) rather than a place. With
	// `false` neither this boundary nor one above it records an address
	// while it is drawn.
	remember?: boolean;
	children: JSX.Element;
}

// Resolves a URL slug to its scope's row through the generated lookup, and
// provides the chain to every child. Nests: a project boundary under an
// organization boundary sends the organization's id with its slug. Draws
// nothing before the first answer; a slug change keeps the children and the
// previous chain until the next answer. An error other than NOT_FOUND is
// thrown, and a 401 under a `SessionBoundary` is the session's (the guard
// sends to the sign-in), anything else the app's error boundary's.
export function ScopeBoundary<S extends Scope>(props: ScopeBoundaryProps<S>) {
	const above = useContext(ScopeEntries);
	const location = useLocation();
	// Addresses are kept per signed-in user; outside a `SessionBoundary`
	// nothing is kept.
	const viewer = useViewer();
	const lookup = () => {
		const input = scopeLookup(props.scope, props.slug, above?.entries());
		if (!input) {
			throw new Error(
				`ScopeBoundary: "${props.scope.name}" sits under no boundary for "${props.scope.parent?.[0].name}".`,
			);
		}
		return input;
	};
	const query = useQuery(() =>
		scopeQueryOptions(props.scope.name, lookup(), fetchScope),
	);
	// The chain the children read: the latest answer, held after it, so a
	// child still being torn down (a closing list, a resize measure) reads the
	// last chain instead of a value that is gone.
	const entries = createMemo<Record<string, unknown> | undefined>(
		(last) => (query.data as Record<string, unknown> | undefined) ?? last,
	);
	// Remembered only once resolved, and only by the deepest boundary that
	// resolved: an address under it that resolves nothing is never the last.
	const path = () =>
		scopePath(location.pathname, above?.path() ?? undefined, props.slug);
	const [deeper, setDeeper] = createSignal(0);
	const claim = () => {
		setDeeper((n) => n + 1);
		return () => setDeeper((n) => n - 1);
	};
	createEffect(() => {
		const address = addressToRemember({
			remember: props.remember,
			answered: query.data !== undefined && !query.isPlaceholderData,
			deeper: deeper(),
			path: path(),
			viewer: viewer?.(),
		});
		if (address) rememberScope(address.viewer, address.path);
	});
	const view = () => boundaryView(query);
	// An address that resolves to nothing (a deleted organization, one the
	// viewer left) is forgotten, so the next `/` does not lead back to it.
	createEffect(() => {
		const id = viewer?.();
		if (view() === "notFound" && id) forgetScopeAt(id, path());
	});
	return (
		<Switch>
			<Match when={view() === "children"}>
				<Chain
					above={above}
					resolved={{ entries: () => entries() ?? {}, path, claim }}
				>
					{props.children}
				</Chain>
			</Match>
			<Match when={view() === "notFound"}>{props.notFound}</Match>
		</Switch>
	);
}

// A resolved boundary's children, counted by the boundary above so only the
// deepest resolved one is remembered.
function Chain(props: {
	above: Resolved | undefined;
	resolved: Resolved;
	children: JSX.Element;
}) {
	if (props.above) onCleanup(props.above.claim());
	return (
		<ScopeEntries.Provider value={props.resolved}>
			{props.children}
		</ScopeEntries.Provider>
	);
}

function useEntries(caller: string): Accessor<Record<string, unknown>> {
	const resolved = useContext(ScopeEntries);
	if (!resolved) throw new Error(`${caller}: no ScopeBoundary above.`);
	return resolved.entries;
}

// The row of `scope`, defined for every child of a boundary at or below it.
export function useScope<S extends Scope>(scope: S): Accessor<ScopeRow<S>> {
	const entries = useEntries(`useScope(${scope.name})`);
	return () => {
		const row = entries()[scope.name];
		if (row === undefined) {
			throw new Error(`useScope(${scope.name}): no boundary resolves it.`);
		}
		return row as ScopeRow<S>;
	};
}

// The caller's membership of the organization the nearest boundary sits in.
export function useMember(): Accessor<MemberRow> {
	const entries = useEntries("useMember()");
	return () => entries().member as MemberRow;
}

// The signed-in viewer's "open where I left off" address, under a
// `SessionBoundary`: `address()` reads it (null when none is kept), and
// `forget()` forgets it for a scope the viewer removed or left. A resolved
// boundary records it, one that resolves to NOT_FOUND forgets it, and the
// session ending forgets it.
export function useLastScope(): {
	address: () => string | null;
	forget: () => void;
} {
	const viewer = useViewer();
	if (!viewer) throw new Error("useLastScope(): no SessionBoundary above.");
	return {
		address: () => {
			const id = viewer();
			return id ? lastScope(id) : null;
		},
		forget: () => {
			const id = viewer();
			if (id) forgetScope(id);
		},
	};
}
