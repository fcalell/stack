import { SWITCH_THUMB, switchTrack, text } from "@fcalell/ui-core/variants";
import * as SwitchPrimitive from "@kobalte/core/switch";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";

// The label is part of the atom so the hit area is the whole 44 px line.
export type SwitchProps = Closed & {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label?: string;
};

export function Switch(props: SwitchProps) {
	return (
		<SwitchPrimitive.Root
			checked={props.checked}
			onChange={props.onChange}
			class="flex min-h-11 w-full cursor-pointer items-center justify-between gap-row"
		>
			<SwitchPrimitive.Input class="peer" />
			<SwitchPrimitive.Label class={text({ role: "body" })}>
				{props.label}
			</SwitchPrimitive.Label>
			<SwitchPrimitive.Control
				class={cn(
					switchTrack({ state: props.checked ? "on" : "off" }),
					"inline-flex h-8 w-13 shrink-0 items-center px-0.5 transition-colors duration-(--duration-base) ease-ui peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-tint peer-disabled:opacity-50",
				)}
			>
				{/* 20px travel: 52 track − 2×2 padding − 28 thumb. */}
				<SwitchPrimitive.Thumb
					class={cn(
						SWITCH_THUMB,
						"size-7 shadow-float transition-transform duration-(--duration-base) ease-ui",
						props.checked && "translate-x-5",
					)}
				/>
			</SwitchPrimitive.Control>
		</SwitchPrimitive.Root>
	);
}
