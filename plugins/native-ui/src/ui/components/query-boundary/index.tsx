import { boundaryState } from "@fcalell/ui-core/list-state";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed";
import { useWords } from "../../lib/words";
import { EmptyStateBase } from "../empty-state/base";
import { Missing } from "../empty-state/missing";

// The part of a TanStack query result a boundary reads; a `useQuery` result
// is one. A failed read's `error` that answers not found draws the missing
// form.
export interface QueryLike<TData> {
	data: TData | undefined;
	isPending: boolean;
	isError: boolean;
	error?: unknown;
	refetch: () => unknown;
}

type AnyQuery = QueryLike<unknown>;

// One query, or several read together.
export type Queries = AnyQuery | readonly [AnyQuery, ...AnyQuery[]];

// The data a boundary hands its children: one query's, or one per query in
// order.
export type QueryData<Q extends Queries> = Q extends readonly AnyQuery[]
	? { -readonly [K in keyof Q]: Q[K] extends QueryLike<infer D> ? D : never }
	: Q extends QueryLike<infer D>
		? D
		: never;

// What a body draws while its queries answer.
export interface QueryBoundaryProps<Q extends Queries = Queries>
	extends Closed {
	query: Q;
	sentence: string;
	children: (data: QueryData<Q>) => ReactNode;
	// The body's loaded form in skeleton, drawn while any query is pending.
	loading: ReactNode;
}

// The states of a compound body that reads queries; a collection takes its
// own query instead (a `List`). While any query is pending, `loading`; in a
// Section the Section is busy and its count waits. When every failed query
// answers not found, the rest EmptyState saying it no longer exists with Back
// (to the enclosing Screen's back, else the Place's route), never Retry; when
// one fails otherwise, the failed EmptyState with `sentence` and Retry, which
// refetches the failed queries; then the children with the data.
export function QueryBoundary<Q extends Queries>({
	query,
	sentence,
	children,
	loading,
}: QueryBoundaryProps<Q>) {
	const words = useWords();
	const several = Array.isArray(query);
	const queries = (several ? query : [query]) as readonly AnyQuery[];
	const pending = queries.some((entry) => entry.isPending);
	if (pending) return <>{loading}</>;
	const state = boundaryState(queries);
	if (state === "missing") return <Missing />;
	if (state === "failed") {
		return (
			<EmptyStateBase
				tone="failed"
				sentence={sentence}
				act={{
					label: words.retry,
					onAct: () => {
						for (const entry of queries) if (entry.isError) entry.refetch();
					},
				}}
			/>
		);
	}
	const data = several
		? queries.map((entry) => entry.data)
		: (query as AnyQuery).data;
	return <>{children(data as QueryData<Q>)}</>;
}
