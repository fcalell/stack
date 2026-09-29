import type { JSX } from "solid-js";
import { children, Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";

// The desktop's columns, composed per place by the consumer: `list` at the
// list width, `main` filling, `pane` at the list width beside `main`,
// pushing it narrower, from the width where the columns fit: desktop when
// there is no list, wide with one, since three columns under wide leave
// `main` too narrow to use. Under that width the pane folds over `main`.
// Under desktop one slot at a time, the deepest present, so the phone sees a
// stack of screens. `empty` fills `main`'s column from desktop while neither
// `main` nor `pane` is present ("Pick an item."); under desktop the list is
// the place, so it never draws.
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
	const present = (slot: unknown) => slot !== undefined && slot !== null;
	const hasList = () => present(list());
	const hasMain = () => present(main());
	const hasPane = () => present(pane());
	return (
		<div class="flex min-h-0 flex-1">
			<Show when={hasList()}>
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
						!hasPane()
							? "flex"
							: hasList()
								? "hidden wide:flex"
								: "hidden desktop:flex",
					)}
				>
					{main()}
				</div>
			</Show>
			<Show when={hasPane()}>
				<div
					class={cn(
						"flex min-h-0 min-w-0 flex-1 flex-col",
						hasList()
							? "wide:w-list wide:flex-none wide:border-l"
							: hasMain()
								? "desktop:w-list desktop:flex-none desktop:border-l"
								: undefined,
					)}
				>
					{pane()}
				</div>
			</Show>
		</div>
	);
}
