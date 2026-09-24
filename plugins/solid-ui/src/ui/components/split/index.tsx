import type { JSX } from "solid-js";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";

// The desktop's columns, composed per place by the consumer: `list` at the
// list width, `main` filling, `pane` beside them from wide and pushing over
// `main` under it. Under desktop one slot at a time, the deepest present, so
// the phone sees a stack of screens.
export type SplitProps = Closed & {
	list?: JSX.Element;
	main?: JSX.Element;
	pane?: JSX.Element;
};

export function Split(props: SplitProps) {
	const hasMain = () => props.main !== undefined;
	const hasPane = () => props.pane !== undefined;
	return (
		<div class="flex min-h-0 flex-1">
			<Show when={props.list}>
				<div
					class={cn(
						"min-h-0 min-w-0 flex-col desktop:flex desktop:w-list desktop:shrink-0 desktop:border-r",
						hasMain() || hasPane() ? "hidden" : "flex flex-1",
					)}
				>
					{props.list}
				</div>
			</Show>
			<Show when={props.main}>
				<div
					class={cn(
						"min-h-0 min-w-0 flex-1 flex-col",
						hasPane() ? "hidden wide:flex" : "flex",
					)}
				>
					{props.main}
				</div>
			</Show>
			<Show when={props.pane}>
				<div class="flex min-h-0 min-w-0 flex-1 flex-col wide:w-list wide:flex-none wide:border-l">
					{props.pane}
				</div>
			</Show>
		</div>
	);
}
