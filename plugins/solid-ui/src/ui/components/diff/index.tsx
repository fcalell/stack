import type { DiffLine, Hunk } from "@fcalell/ui-core/descriptors";
import { CODE, DIFF_GUTTER, diffLine } from "@fcalell/ui-core/variants";
import { createMemo, For, Show } from "solid-js";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";
import { LoadingRows } from "#lib/loading";

// Mono with a line-number gutter pinned left; added lines on the ok soft,
// removed on the danger soft, hunk headers on the group fill. `split` is two
// panes sharing the scroll, picked by the parent from the molecule's width.
export type DiffProps = Closed & {
	hunks: Hunk[];
	layout?: "unified" | "split";
	loading?: boolean;
};

const GUTTER = cn(
	DIFF_GUTTER,
	"sticky left-0 w-12 shrink-0 select-none bg-inherit pr-row text-right tabular-nums",
);

function Line(props: { line: DiffLine; side?: "before" | "after" }) {
	const number = () =>
		props.side === "before"
			? props.line.before
			: props.side === "after"
				? props.line.after
				: (props.line.after ?? props.line.before);
	return (
		<div
			class={cn(diffLine({ kind: props.line.kind }), "flex bg-inherit px-row")}
		>
			<span class={GUTTER}>{number()}</span>
			<span class="whitespace-pre">{props.line.text}</span>
		</div>
	);
}

type Pair = { before?: DiffLine; after?: DiffLine };

// Removed lines pair with the added lines that follow them; context sits on
// both sides.
function pairs(lines: DiffLine[]): Pair[] {
	const out: Pair[] = [];
	let removed: DiffLine[] = [];
	let added: DiffLine[] = [];
	const flush = () => {
		const count = Math.max(removed.length, added.length);
		for (let i = 0; i < count; i++)
			out.push({ before: removed[i], after: added[i] });
		removed = [];
		added = [];
	};
	for (const line of lines) {
		if (line.kind === "removed") removed.push(line);
		else if (line.kind === "added") added.push(line);
		else {
			flush();
			out.push({ before: line, after: line });
		}
	}
	flush();
	return out;
}

export function Diff(props: DiffProps) {
	const split = () => props.layout === "split";
	const paired = createMemo(() =>
		props.hunks.map((hunk) => ({ hunk, pairs: pairs(hunk.lines) })),
	);
	return (
		<Show when={!props.loading} fallback={<LoadingRows />}>
			<div class={cn(CODE, "overflow-x-auto p-0")}>
				<Show
					when={split()}
					fallback={
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
					}
				>
					<For each={paired()}>
						{({ hunk, pairs }) => (
							<>
								<div class={cn(diffLine({ kind: "header" }), "px-row")}>
									{hunk.header}
								</div>
								<For each={pairs}>
									{(pair) => (
										<div class="grid grid-cols-2">
											<div class="min-w-0 border-r">
												<Show when={pair.before}>
													{(line) => <Line line={line()} side="before" />}
												</Show>
											</div>
											<div class="min-w-0">
												<Show when={pair.after}>
													{(line) => <Line line={line()} side="after" />}
												</Show>
											</div>
										</div>
									)}
								</For>
							</>
						)}
					</For>
				</Show>
			</div>
		</Show>
	);
}
