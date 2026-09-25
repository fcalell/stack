import { METER_FILL, METER_TRACK, text } from "@fcalell/ui-core/variants";
import * as SliderPrimitive from "@kobalte/core/slider";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";

// A labelled track: a thin bar inside a 44 px hit area, the value drawn
// beside the label in its `unit`, an Intl unit identifier such as
// "percent", formatted for the browser's locale. The thumb is the one
// control; no native input sits in it, since the value reaches the consumer
// through `onChange`.
export type SliderProps = Closed & {
	label: string;
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	unit?: string;
};

export function Slider(props: SliderProps) {
	return (
		<SliderPrimitive.Root
			value={[props.value]}
			onChange={(values) => props.onChange(values[0] ?? props.value)}
			minValue={props.min ?? 0}
			maxValue={props.max ?? 100}
			step={props.step ?? 1}
			getValueLabel={({ values }) =>
				new Intl.NumberFormat(
					undefined,
					props.unit ? { style: "unit", unit: props.unit } : {},
				).format(values[0] ?? props.value)
			}
			class="flex w-full flex-col gap-pair"
		>
			<div class="flex items-center justify-between gap-row">
				<SliderPrimitive.Label class={text({ role: "body" })}>
					{props.label}
				</SliderPrimitive.Label>
				<SliderPrimitive.ValueLabel
					class={cn(text({ role: "meta" }), "tabular-nums")}
				/>
			</div>
			<SliderPrimitive.Track class="relative flex h-11 items-center">
				<div class={cn(METER_TRACK, "relative h-2 w-full overflow-hidden")}>
					<SliderPrimitive.Fill class={cn(METER_FILL, "absolute inset-y-0")} />
				</div>
				<SliderPrimitive.Thumb class="absolute top-1/2 size-6 -translate-y-1/2 rounded-full bg-thumb shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tint" />
			</SliderPrimitive.Track>
		</SliderPrimitive.Root>
	);
}
