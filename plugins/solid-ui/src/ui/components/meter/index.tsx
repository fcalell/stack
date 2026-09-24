import { METER_FILL, METER_TRACK, text } from "@fcalell/ui-core/variants";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";
import { LoadingRows } from "#lib/loading";

// A labelled fill with the value beside it.
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
						{props.value} / {props.max}
					</span>
				</div>
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
