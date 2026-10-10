import type {
	QueryData,
	QueryLike,
} from "../src/ui/components/query-boundary/index.tsx";

type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;
function assertType<T extends true>(_: T): void {}

// The shape of TanStack's `UseQueryResult`: a union whose pending and error
// members carry no data.
type Result<T> =
	| { data: undefined; isPending: true; isError: false; refetch: () => void }
	| { data: undefined; isPending: false; isError: true; refetch: () => void }
	| { data: T; isPending: false; isError: false; refetch: () => void };

// a lone query's children get its data, never undefined
assertType<Equal<QueryData<Result<string[]>>, string[]>>(true);

// a tuple's children get each query's data in order
assertType<
	Equal<QueryData<[Result<string[]>, Result<number>]>, [string[], number]>
>(true);

// a query's error reaches the boundary, so a not-found answer draws the missing form
assertType<Equal<QueryLike<string[]>["error"], unknown>>(true);
type Failed = Result<string[]> & { error: Error | null };
assertType<Failed extends QueryLike<string[]> ? true : false>(true);
