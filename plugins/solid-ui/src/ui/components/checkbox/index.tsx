import { CHECKBOX_MARK, checkbox, text } from "@fcalell/ui-core/variants";
import * as CheckboxPrimitive from "@kobalte/core/checkbox";
import { Check } from "lucide-solid";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";

// The label is part of the atom so the hit area is the whole 44 px line.
export type CheckboxProps = Closed & {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label?: string;
};

export function Checkbox(props: CheckboxProps) {
	return (
		<CheckboxPrimitive.Root
			checked={props.checked}
			onChange={props.onChange}
			class="flex min-h-11 w-full cursor-pointer items-center justify-between gap-row"
		>
			<CheckboxPrimitive.Input class="peer" />
			<CheckboxPrimitive.Label class={text({ role: "body" })}>
				{props.label}
			</CheckboxPrimitive.Label>
			<CheckboxPrimitive.Control
				class={cn(
					checkbox({ state: props.checked ? "checked" : "unchecked" }),
					CHECKBOX_MARK,
					"inline-flex size-6 shrink-0 items-center justify-center transition-colors duration-(--duration-fast) ease-ui peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-tint",
				)}
			>
				<CheckboxPrimitive.Indicator>
					<Check class="size-4" aria-hidden="true" />
				</CheckboxPrimitive.Indicator>
			</CheckboxPrimitive.Control>
		</CheckboxPrimitive.Root>
	);
}
