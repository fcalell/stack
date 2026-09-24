import { METER_FILL, METER_TRACK, text } from "@fcalell/ui-core/variants";
import * as SliderPrimitive from "@kobalte/core/slider";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";

// A labelled track, 44 px tall, the value drawn beside the thumb.
export type SliderProps = Closed & {
	label: string;
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
};

export function Slider(props: SliderProps) {
	return (
		<SliderPrimitive.Root
			value={[props.value]}
			onChange={(values) => props.onChange(values[0] ?? props.value)}
			minValue={props.min ?? 0}
			maxValue={props.max ?? 100}
			step={props.step ?? 1}
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
			<SliderPrimitive.Track
				class={cn(METER_TRACK, "relative flex h-11 items-center")}
			>
				<div class="relative h-2 w-full overflow-hidden rounded-full">
					<SliderPrimitive.Fill class={cn(METER_FILL, "absolute inset-y-0")} />
				</div>
				<SliderPrimitive.Thumb class="absolute top-1/2 size-6 -translate-y-1/2 rounded-full bg-thumb shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tint">
					<SliderPrimitive.Input />
				</SliderPrimitive.Thumb>
			</SliderPrimitive.Track>
		</SliderPrimitive.Root>
	);
}
