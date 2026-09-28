import { fetchScope, scopeQueryKey } from "@fcalell/plugin-api/ability-client";
import type { MemberRow, Scope } from "@fcalell/plugin-auth/scope";
import { useLocation } from "@solidjs/router";
import { useQuery } from "@tanstack/solid-query";
import {
	type Accessor,
	createContext,
	createEffect,
	type JSX,
	Match,
	Switch,
	useContext,
} from "solid-js";
import { isNotFound, scopeLookup } from "#lib/scope-lookup.ts";

// The resolved chain of the nearest boundary: each level's row by scope
// name, and the caller's `member` row.
const ScopeEntries = createContext<Accessor<Record<string, unknown>>>();

export type ScopeRow<S> =
	S extends Scope<infer N, infer C> ? C[N & keyof C] : never;

export interface ScopeBoundaryProps<S extends Scope> {
	scope: S;
	// The URL's name for the row, usually a route param.
	slug: string;
	// Drawn when no such row exists or the caller is no member: the screen's
	// `EmptyState`, in the consumer's words.
	notFound: JSX.Element;
	children: JSX.Element;
}

// Resolves a URL slug to its scope's row through the generated lookup, and
// provides the chain to every child. Nests: a project boundary under an
// organization boundary sends the organization's id with its slug. Draws
// nothing while the lookup is pending; an error other than NOT_FOUND goes to
// the app's error boundary.
export function ScopeBoundary<S extends Scope>(props: ScopeBoundaryProps<S>) {
	const above = useContext(ScopeEntries);
	const location = useLocation();
	const lookup = () => {
		const input = scopeLookup(props.scope, props.slug, above?.());
		if (!input) {
			throw new Error(
				`ScopeBoundary: "${props.scope.name}" sits under no boundary for "${props.scope.parent?.[0].name}".`,
			);
		}
		return input;
	};
	const query = useQuery(() => ({
		queryKey: scopeQueryKey(props.scope.name, lookup()),
		queryFn: () => fetchScope(props.scope.name, lookup()),
		retry: (count: number, error: Error) => !isNotFound(error) && count < 3,
		throwOnError: (error: Error) => !isNotFound(error),
	}));
	createEffect(() => {
		if (query.data) rememberScope(location.pathname);
	});
	return (
		<Switch>
			<Match when={query.data}>
				{(entries) => (
					<ScopeEntries.Provider value={entries}>
						{props.children}
					</ScopeEntries.Provider>
				)}
			</Match>
			<Match when={isNotFound(query.error)}>{props.notFound}</Match>
		</Switch>
	);
}

function useEntries(caller: string): Accessor<Record<string, unknown>> {
	const entries = useContext(ScopeEntries);
	if (!entries) throw new Error(`${caller}: no ScopeBoundary above.`);
	return entries;
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

// The viewer's last resolved address, for the "open where I left off"
// redirect. Kept per browser, never in the session; storage can be absent
// (private windows) and then there is simply none.
const LAST_SCOPE_KEY = "stack:last-scope";

function rememberScope(path: string): void {
	try {
		localStorage.setItem(LAST_SCOPE_KEY, path);
	} catch {
		// no storage: nothing to remember
	}
}

export function lastScope(): string | null {
	try {
		return localStorage.getItem(LAST_SCOPE_KEY);
	} catch {
		return null;
	}
}
