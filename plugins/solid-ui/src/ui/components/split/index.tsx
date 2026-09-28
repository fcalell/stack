import type { JSX } from "solid-js";
import { children, Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";

// The desktop's columns, composed per place by the consumer: `list` at the
// list width, `main` filling, `pane` beside them from wide and pushing over
// `main` under it. Under desktop one slot at a time, the deepest present, so
// the phone sees a stack of screens. `empty` fills `main`'s column from
// desktop while neither `main` nor `pane` is present ("Pick an item."); under
// desktop the list is the place, so it never draws.
export type SplitProps = Closed & {
	list?: JSX.Element;
	main?: JSX.Element;
	pane?: JSX.Element;
	empty?: JSX.Element;
};

export function Split(props: SplitProps) {
	// Each slot is resolved once and kept: reading a JSX prop builds it again,
	// and a screen built twice runs its reads and its effects twice.
	const list = children(() => props.list);
	const main = children(() => props.main);
	const pane = children(() => props.pane);
	const empty = children(() => props.empty);
	const hasMain = () => main() !== undefined && main() !== null;
	const hasPane = () => pane() !== undefined && pane() !== null;
	return (
		<div class="flex min-h-0 flex-1">
			<Show when={list()}>
				<div
					class={cn(
						"min-h-0 min-w-0 flex-col desktop:flex desktop:w-list desktop:flex-none desktop:border-r",
						hasMain() || hasPane() ? "hidden" : "flex flex-1",
					)}
				>
					{list()}
				</div>
			</Show>
			<Show when={empty() && !hasMain() && !hasPane()}>
				<div class="hidden min-h-0 min-w-0 flex-1 flex-col desktop:flex">
					{empty()}
				</div>
			</Show>
			<Show when={hasMain()}>
				<div
					class={cn(
						"min-h-0 min-w-0 flex-1 flex-col",
						hasPane() ? "hidden wide:flex" : "flex",
					)}
				>
					{main()}
				</div>
			</Show>
			<Show when={hasPane()}>
				<div class="flex min-h-0 min-w-0 flex-1 flex-col wide:w-list wide:flex-none wide:border-l">
					{pane()}
				</div>
			</Show>
		</div>
	);
}
