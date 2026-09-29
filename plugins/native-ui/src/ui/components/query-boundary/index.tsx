import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed";
import { LoadingRows } from "../../lib/loading";
import { useWords } from "../../lib/words";
import { EmptyState } from "../empty-state";

// The part of a TanStack query result a boundary reads; a `useQuery` result
// is one.
export interface QueryLike<TData> {
	data: TData | undefined;
	isPending: boolean;
	isError: boolean;
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

// What a screen draws while its queries answer: the loading form while any
// is pending, the screen's `EmptyState` with `sentence` and a retry act when
// one fails, and the children with the data once every query has it.
export interface QueryBoundaryProps<Q extends Queries = Queries>
	extends Closed {
	query: Q;
	sentence: string;
	children: (data: QueryData<Q>) => ReactNode;
}

export function QueryBoundary<Q extends Queries>({
	query,
	sentence,
	children,
}: QueryBoundaryProps<Q>) {
	const words = useWords();
	const several = Array.isArray(query);
	const queries = (several ? query : [query]) as readonly AnyQuery[];
	if (queries.some((entry) => entry.isPending)) return <LoadingRows />;
	if (queries.some((entry) => entry.isError)) {
		return (
			<EmptyState
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
