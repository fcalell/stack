import { CONTROL_MUTED, TOGGLE_KNOB, toggle } from "@fcalell/ui-core/variants";
import * as SwitchPrimitive from "@kobalte/core/switch";
import { cn } from "#lib/cn";

// `checked` and `onChange` are required: an uncontrolled Kobalte switch flips
// its accessible state while a prop-computed cva freezes, so the prop is what
// keeps the call-not-selector shape sound. The props type is our own, which
// keeps `defaultChecked` and the rest of Kobalte's surface out.
type ToggleProps = {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	class?: never;
	style?: never;
	classList?: never;
};

function Toggle(props: ToggleProps) {
	return (
		<SwitchPrimitive.Root
			checked={props.checked}
			onChange={props.onChange}
			disabled={props.disabled}
		>
			<SwitchPrimitive.Input class="peer" />
			<SwitchPrimitive.Control
				class={cn(
					toggle({ state: props.checked ? "on" : "off" }),
					"inline-flex h-6 w-10 items-center px-1",
					"peer-focus-visible:outline-2 peer-focus-visible:outline-interactive peer-focus-visible:outline-offset-2",
					props.disabled && CONTROL_MUTED,
				)}
			>
				{/* 16px travel: 40 track − 2×4 padding − 16 knob. */}
				<SwitchPrimitive.Thumb
					class={cn(
						TOGGLE_KNOB,
						"size-4 transition-transform",
						props.checked && "translate-x-4",
					)}
				/>
			</SwitchPrimitive.Control>
		</SwitchPrimitive.Root>
	);
}

export type { ToggleProps };
export { Toggle };
