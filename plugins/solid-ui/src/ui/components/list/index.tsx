import type { JSX } from "solid-js";
import { children, For, Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { LoadingRows } from "#lib/loading.tsx";

// Rows that are a feed: on the surface with no box and no hairlines, each at
// least 44 px. The list owns the semantics: each child is one item, whatever
// it is (a row, a message, a folded section, a group).
export type ListProps = Closed & {
	loading?: boolean;
	children?: JSX.Element;
};

export function List(props: ListProps) {
	const items = children(() => props.children);
	return (
		<Show when={!props.loading} fallback={<LoadingRows />}>
			<ul class="flex flex-col">
				<For each={items.toArray()}>
					{(item) => <li class="flex flex-col">{item}</li>}
				</For>
			</ul>
		</Show>
	);
}
