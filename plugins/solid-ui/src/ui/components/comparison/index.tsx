import type { ComparisonRow } from "@fcalell/ui-core/descriptors";
import { COUNT, GROUP, HAIRLINE, row, text } from "@fcalell/ui-core/variants";
import { createMemo, createSignal, For, Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { LoadingRows } from "#lib/loading.tsx";
import { SegmentedControl } from "../segmented-control/index.tsx";

// A group of labelled rows with two or three cells. From desktop the cells
// sit side by side, the newest right, an older value struck through where it
// changed; under it one cell shows at a time under a segmented control of
// the cell labels.
export type ComparisonProps = Closed & {
	rows: ComparisonRow[];
	loading?: boolean;
};

export function Comparison(props: ComparisonProps) {
	const labels = createMemo(
		() => props.rows[0]?.cells.map((cell) => cell.label) ?? [],
	);
	const [shown, setShown] = createSignal(labels()[labels().length - 1] ?? "");
	const shownIndex = () => Math.max(0, labels().indexOf(shown()));
	return (
		<Show when={!props.loading} fallback={<LoadingRows />}>
			<div class="flex flex-col gap-stack">
				<div class="desktop:hidden">
					<SegmentedControl
						options={labels().map((label) => ({ value: label, label }))}
						value={shown()}
						onChange={setShown}
					/>
				</div>
				<div
					class={cn(
						GROUP,
						HAIRLINE,
						"flex flex-col overflow-hidden [&>*+*]:border-t",
					)}
				>
					<For each={props.rows}>
						{(item) => {
							const newest = () => item.cells[item.cells.length - 1]?.value;
							return (
								<div
									class={cn(
										row({ state: "rest" }),
										"flex flex-col desktop:flex-row desktop:items-start",
									)}
								>
									<span
										class={cn(
											text({ role: "meta" }),
											"desktop:w-1/4 desktop:shrink-0",
										)}
									>
										{item.label}
									</span>
									<div class="flex min-w-0 flex-1 flex-col gap-pair desktop:flex-row desktop:gap-stack">
										<For each={item.cells}>
											{(cell, index) => {
												const older = () =>
													index() < item.cells.length - 1 &&
													cell.value !== newest();
												return (
													<span
														class={cn(
															text({ role: "body" }),
															"min-w-0 flex-1 break-words",
															older() && "text-ink-meta line-through",
															index() !== shownIndex() &&
																"hidden desktop:block",
														)}
													>
														{cell.value}
													</span>
												);
											}}
										</For>
									</div>
									<Show when={item.chips?.length}>
										<span class="flex shrink-0 flex-wrap gap-pair">
											<For each={item.chips}>
												{(chip) => (
													<span class={cn(COUNT, "inline-flex")}>
														{chip.label}
													</span>
												)}
											</For>
										</span>
									</Show>
								</div>
							);
						}}
					</For>
				</div>
			</div>
		</Show>
	);
}
