import {
	type Accessor,
	createMemo,
	type JSX,
	Match,
	Switch,
	untrack,
} from "solid-js";
import { useBoxed } from "#lib/boxed.ts";
import type { Closed } from "#lib/closed.ts";
import { LoadingRows } from "#lib/loading.tsx";
import { combineQueries, type QueryLike } from "#lib/query.ts";
import { useWords } from "#lib/words.tsx";
import { EmptyState } from "../empty-state/index.tsx";

type AnyQuery = QueryLike<unknown, unknown>;

// One query, or several read together.
export type Queries = AnyQuery | readonly [AnyQuery, ...AnyQuery[]];

// The data a boundary hands its children: one query's, or one per query in
// order. Children draw only once every query has answered, and a query's
// answer is never `undefined`, so the data is defined.
export type QueryData<Q extends Queries> = Q extends readonly AnyQuery[]
	? {
			-readonly [K in keyof Q]: Q[K] extends QueryLike<infer D, unknown>
				? Exclude<D, undefined>
				: never;
		}
	: Q extends QueryLike<infer D, unknown>
		? Exclude<D, undefined>
		: never;

// What a screen draws while its queries answer: the loading form of the
// container around it while any is pending, the screen's `EmptyState` with
// `sentence` and a retry act when one fails, and the children with the data
// once every query has it. The children read the data through an accessor,
// so a refetch updates them in place.
export type QueryBoundaryProps<Q extends Queries = Queries> = Closed & {
	query: Q;
	sentence: string;
	children: (data: Accessor<QueryData<Q>>) => JSX.Element;
};

export function QueryBoundary<Q extends Queries>(props: QueryBoundaryProps<Q>) {
	const words = useWords();
	const boxed = useBoxed();
	const query = createMemo(
		(): AnyQuery =>
			Array.isArray(props.query)
				? combineQueries(...(props.query as AnyQuery[]))
				: (props.query as AnyQuery),
	);
	const data = () => query().data as QueryData<Q>;
	return (
		<Switch>
			<Match when={query().isPending}>
				<LoadingRows inGroup={boxed} />
			</Match>
			<Match when={query().isError}>
				<EmptyState
					sentence={props.sentence}
					act={{ label: words.retry, onAct: () => query().refetch() }}
				/>
			</Match>
			<Match when={true}>{untrack(() => props.children(data))}</Match>
		</Switch>
	);
}
