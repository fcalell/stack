import type { Option } from "@fcalell/ui-core/descriptors";
import { SEGMENTED_CONTROL, segment } from "@fcalell/ui-core/variants";
import * as RadioGroup from "@kobalte/core/radio-group";
import { For } from "solid-js";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";

// A state the control rests on, never a trigger: one pill per option, the
// chosen one raised.
export type SegmentedControlProps = Closed & {
	options: Option[];
	value: string;
	onChange: (value: string) => void;
};

export function SegmentedControl(props: SegmentedControlProps) {
	return (
		<RadioGroup.Root
			value={props.value}
			onChange={props.onChange}
			orientation="horizontal"
			class={cn(SEGMENTED_CONTROL, "inline-flex items-center")}
		>
			<For each={props.options}>
				{(option) => (
					<RadioGroup.Item value={option.value}>
						<RadioGroup.ItemInput class="peer" />
						<RadioGroup.ItemLabel
							class={cn(
								segment({
									state: option.value === props.value ? "selected" : "idle",
								}),
								"inline-flex cursor-pointer items-center justify-center whitespace-nowrap transition-colors duration-(--duration-fast) ease-ui peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-tint",
								option.value === props.value && "shadow-float",
							)}
						>
							{option.label}
						</RadioGroup.ItemLabel>
					</RadioGroup.Item>
				)}
			</For>
		</RadioGroup.Root>
	);
}
