import { type ReactNode, useContext, useEffect } from "react";
import type { Closed } from "../../lib/closed";
import { LoadingContext } from "../../lib/loading";
import { SectionContext } from "../../lib/section";
import { useWords } from "../../lib/words";
import { EmptyStateBase } from "../empty-state/base";
import { Group } from "../group";
import { List } from "../list";

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

// What a body draws while its queries answer.
export interface QueryBoundaryProps<Q extends Queries = Queries>
	extends Closed {
	query: Q;
	sentence: string;
	children: (data: QueryData<Q>) => ReactNode;
}

// The loading form of the container around it while any query is pending:
// in a Section the Section's (busy, its count waiting) over a Group's
// setting rows, anywhere else a List's two-line rows. When one fails, the
// failed EmptyState with `sentence` and Retry, which refetches the failed
// queries; then the children with the data.
export function QueryBoundary<Q extends Queries>({
	query,
	sentence,
	children,
}: QueryBoundaryProps<Q>) {
	const words = useWords();
	const wait = useContext(SectionContext);
	const several = Array.isArray(query);
	const queries = (several ? query : [query]) as readonly AnyQuery[];
	const pending = queries.some((entry) => entry.isPending);
	useEffect(() => {
		if (!pending || !wait) return;
		wait(true);
		return () => wait(false);
	}, [pending, wait]);
	if (pending)
		return wait ? (
			// The Section is busy once, so its rows wait on its word.
			<LoadingContext.Provider value>
				<Group />
			</LoadingContext.Provider>
		) : (
			<List loading />
		);
	if (queries.some((entry) => entry.isError)) {
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
