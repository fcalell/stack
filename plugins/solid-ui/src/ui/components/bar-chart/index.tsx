import type { BarSeries } from "@fcalell/ui-core/descriptors";
import { METER_TRACK, text } from "@fcalell/ui-core/variants";
import { createMemo, For, Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { LoadingRows } from "#lib/loading.tsx";

// One labelled bar per series item, stacked by its parts, the value beside it
// with the unit, the time under it.
export type BarChartProps = Closed & {
	series: BarSeries[];
	unit: string;
	loading?: boolean;
};

const PART_FILLS = ["bg-tint", "bg-accent-soft", "bg-edge"];

export function BarChart(props: BarChartProps) {
	const max = createMemo(() =>
		props.series.reduce((top, item) => Math.max(top, item.value), 0),
	);
	return (
		<Show when={!props.loading} fallback={<LoadingRows />}>
			<div class="flex flex-col gap-stack">
				<For each={props.series}>
					{(item) => (
						<div class="flex flex-col gap-pair">
							<div class="flex items-center justify-between gap-row">
								<span class={text({ role: "body" })}>{item.label}</span>
								<span class={cn(text({ role: "meta" }), "tabular-nums")}>
									{item.value} {props.unit}
								</span>
							</div>
							<div
								role="img"
								aria-label={`${item.label} ${item.value} ${props.unit}`}
								class={cn(METER_TRACK, "flex h-3 w-full overflow-hidden")}
							>
								<For
									each={
										item.parts ?? [{ label: item.label, value: item.value }]
									}
								>
									{(part, index) => (
										<div
											title={part.label}
											class={cn(
												"h-full",
												PART_FILLS[index() % PART_FILLS.length],
											)}
											style={{
												width: `${max() > 0 ? (part.value / max()) * 100 : 0}%`,
											}}
										/>
									)}
								</For>
							</div>
							<Show when={item.at}>
								<span class={cn(text({ role: "meta" }), "tabular-nums")}>
									{item.at}
								</span>
							</Show>
						</div>
					)}
				</For>
			</div>
		</Show>
	);
}
