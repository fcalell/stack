import type { JSX } from "solid-js";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed";
import { LoadingRows } from "#lib/loading";

// Rows that are a feed: on the surface with no box and no hairlines, each at
// least 44 px.
export type ListProps = Closed & {
	loading?: boolean;
	children?: JSX.Element;
};

export function List(props: ListProps) {
	return (
		<ul class="flex flex-col">
			<Show when={!props.loading} fallback={<LoadingRows />}>
				{props.children}
			</Show>
		</ul>
	);
}
