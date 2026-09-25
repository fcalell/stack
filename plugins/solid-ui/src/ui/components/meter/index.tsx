import { METER_FILL, METER_TRACK, text } from "@fcalell/ui-core/variants";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { LoadingRows } from "#lib/loading.tsx";

// A labelled fill with its share of the whole beside it, as a percentage.
export type MeterProps = Closed & {
	label: string;
	value: number;
	max: number;
	meta?: string;
	loading?: boolean;
};

export function Meter(props: MeterProps) {
	const ratio = () =>
		props.max > 0 ? Math.min(1, props.value / props.max) : 0;
	return (
		<Show when={!props.loading} fallback={<LoadingRows />}>
			<div class="flex flex-col gap-pair">
				<div class="flex items-center justify-between gap-row">
					<span class={text({ role: "body" })}>{props.label}</span>
					<span class={cn(text({ role: "meta" }), "tabular-nums")}>
						{Math.round(ratio() * 100)}%
					</span>
				</div>
				{/* The drawn fill is for the eye; the native meter is what is read. */}
				<meter
					class="sr-only"
					aria-label={props.label}
					min={0}
					max={props.max}
					value={props.value}
				/>
				<div
					aria-hidden="true"
					class={cn(METER_TRACK, "h-2 w-full overflow-hidden")}
				>
					<div
						class={cn(METER_FILL, "h-full")}
						style={{ width: `${ratio() * 100}%` }}
					/>
				</div>
				<Show when={props.meta}>
					<p class={text({ role: "meta" })}>{props.meta}</p>
				</Show>
			</div>
		</Show>
	);
}
