import { TriangleAlert } from "lucide-solid";
import type { Accessor, JSX } from "solid-js";
import {
	createEffect,
	createMemo,
	createSignal,
	Match,
	onCleanup,
	Switch,
	untrack,
} from "solid-js";
import { Button } from "#components/button";
import { EmptyState } from "#components/empty-state";
import { Loader } from "#components/loader";

type QueryLike<TData, TError> = {
	data: TData | undefined;
	isPending: boolean;
	isError: boolean;
	error: TError | null;
	refetch: () => void;
	isRefetching?: boolean;
};

type QueryBoundaryProps<TData, TError = Error> = {
	query: QueryLike<TData, TError>;
	loadingText?: string;
	loadingFallback?: JSX.Element;
	gracePeriod?: number;
	errorFallback?: (error: TError, retry: () => void) => JSX.Element;
	emptyWhen?: (data: TData) => boolean;
	emptyFallback?: JSX.Element;
	children: (data: Accessor<TData>) => JSX.Element;
	class?: never;
	style?: never;
	classList?: never;
};

function QueryBoundary<TData, TError = Error>(
	props: QueryBoundaryProps<TData, TError>,
) {
	const [showLoading, setShowLoading] = createSignal(false);

	createEffect(() => {
		if (props.query.isPending) {
			const timer = setTimeout(
				() => setShowLoading(true),
				props.gracePeriod ?? 150,
			);
			onCleanup(() => clearTimeout(timer));
		} else {
			setShowLoading(false);
		}
	});

	const state = createMemo(() => {
		if (props.query.isPending) return "pending" as const;
		if (props.query.isError && props.query.data === undefined)
			return "error" as const;
		if (props.query.data !== undefined) return "data" as const;
		return "pending" as const;
	});

	return (
		<Switch>
			<Match when={state() === "pending"}>
				{showLoading()
					? (props.loadingFallback ?? (
							<div
								class="flex items-center justify-center py-8"
							>
								<Loader text={props.loadingText ?? "loading..."} />
							</div>
						))
					: null}
			</Match>
			<Match when={state() === "error"}>
				{props.errorFallback ? (
					props.errorFallback(props.query.error as TError, () =>
						props.query.refetch(),
					)
				) : (
					<EmptyState
						icon={<TriangleAlert />}
						title="Failed to load"
						description={
							props.query.error instanceof Error
								? props.query.error.message
								: "An unexpected error occurred"
						}
					>
						<Button size="sm" onClick={() => props.query.refetch()}>
							Retry
						</Button>
					</EmptyState>
				)}
			</Match>
			<Match
				when={
					state() === "data" && props.emptyWhen?.(props.query.data as TData)
				}
			>
				{props.emptyFallback}
			</Match>
			<Match when={state() === "data"}>
				{untrack(() => props.children(() => props.query.data as TData))}
			</Match>
		</Switch>
	);
}

export type { QueryBoundaryProps, QueryLike };
export { QueryBoundary };
