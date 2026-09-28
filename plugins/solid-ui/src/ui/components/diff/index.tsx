import type { DiffLine, Hunk } from "@fcalell/ui-core/descriptors";
import { CODE, DIFF_GUTTER, diffLine } from "@fcalell/ui-core/variants";
import {
	createMemo,
	createSignal,
	For,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { RING_INSET } from "#lib/interact.ts";
import { LoadingRows } from "#lib/loading.tsx";

// Mono with a line-number gutter pinned left; added lines on the ok soft,
// removed on the danger soft, hunk headers on the group fill. It goes side
// by side, two panes sharing the scroll, once its own width holds two
// panes of SIDE characters; a file that only adds or only removes stays
// unified, since one side of it would be empty.
export type DiffProps = Closed & {
	hunks: Hunk[];
	loading?: boolean;
};

const SIDE = 60;

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
	// `bg-inherit` first, so a context line keeps the block's fill under the
	// pinned gutter and an added or removed line's own fill wins the merge.
	return (
		<div
			class={cn("flex bg-inherit px-row", diffLine({ kind: props.line.kind }))}
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
	let box!: HTMLDivElement;
	let probe!: HTMLDivElement;
	const [wide, setWide] = createSignal(false);
	onMount(() => {
		// A pane is the gutter and SIDE characters of the mono face, read off a
		// probe line so the threshold follows the theme's font and size.
		const pane = () => {
			const [gutter, glyph] = [...probe.children].map(
				(part) => part.getBoundingClientRect().width,
			);
			return (gutter ?? 0) + (glyph ?? 0) * SIDE;
		};
		const observer = new ResizeObserver(([entry]) => {
			if (entry) setWide(entry.contentRect.width >= 2 * pane());
		});
		observer.observe(box);
		onCleanup(() => observer.disconnect());
	});
	const oneSided = createMemo(() => {
		const kinds = new Set(
			props.hunks.flatMap((hunk) => hunk.lines.map((line) => line.kind)),
		);
		return (
			!kinds.has("context") && !(kinds.has("added") && kinds.has("removed"))
		);
	});
	const split = () => wide() && !oneSided();
	const paired = createMemo(() =>
		props.hunks.map((hunk) => ({ hunk, pairs: pairs(hunk.lines) })),
	);
	return (
		<Show when={!props.loading} fallback={<LoadingRows />}>
			{/* The surface keeps its corners; the scroller inside it takes focus
			    so a keyboard can scroll it. */}
			<div ref={box} class={cn(CODE, "relative overflow-hidden p-0")}>
				<div
					ref={probe}
					aria-hidden="true"
					class={cn(diffLine({ kind: "context" }), "invisible absolute flex")}
				>
					<span class={GUTTER} />
					<span>0</span>
				</div>
				<div tabindex="0" class={cn("overflow-x-auto", RING_INSET)}>
					<Show
						when={split()}
						fallback={
							<For each={props.hunks}>
								{(hunk) => (
									<>
										<div class={cn(diffLine({ kind: "header" }), "px-row")}>
											{hunk.header}
										</div>
										<For each={hunk.lines}>
											{(line) => <Line line={line} />}
										</For>
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
			</div>
		</Show>
	);
}
