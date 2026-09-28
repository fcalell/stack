import type { DiffLine, Hunk } from "@fcalell/ui-core/descriptors";
import { CODE, DIFF_GUTTER, diffLine } from "@fcalell/ui-core/variants";
import { For, Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { RING_INSET } from "#lib/interact.ts";
import { LoadingRows } from "#lib/loading.tsx";

// Mono with a line-number gutter pinned left; added lines on the ok soft,
// removed on the danger soft, hunk headers on the group fill. One column at
// every width: a pane is never wide enough for two readable sides.
export type DiffProps = Closed & {
	hunks: Hunk[];
	loading?: boolean;
};

const GUTTER = cn(
	DIFF_GUTTER,
	"sticky left-0 w-12 shrink-0 select-none bg-inherit pr-row text-right tabular-nums",
);

function Line(props: { line: DiffLine }) {
	// `bg-inherit` first, so a context line keeps the block's fill under the
	// pinned gutter and an added or removed line's own fill wins the merge.
	return (
		<div
			class={cn("flex bg-inherit px-row", diffLine({ kind: props.line.kind }))}
		>
			<span class={GUTTER}>{props.line.after ?? props.line.before}</span>
			<span class="whitespace-pre">{props.line.text}</span>
		</div>
	);
}

export function Diff(props: DiffProps) {
	return (
		<Show when={!props.loading} fallback={<LoadingRows />}>
			{/* The surface keeps its corners; the scroller inside it takes focus
			    so a keyboard can scroll it. */}
			<div class={cn(CODE, "overflow-hidden p-0")}>
				<div tabindex="0" class={cn("overflow-x-auto", RING_INSET)}>
					<For each={props.hunks}>
						{(hunk) => (
							<>
								<div class={cn(diffLine({ kind: "header" }), "px-row")}>
									{hunk.header}
								</div>
								<For each={hunk.lines}>{(line) => <Line line={line} />}</For>
							</>
						)}
					</For>
				</div>
			</div>
		</Show>
	);
}
