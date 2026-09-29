import { CHECKBOX_MARK, checkbox, text } from "@fcalell/ui-core/variants";
import * as CheckboxPrimitive from "@kobalte/core/checkbox";
import { Check } from "lucide-solid";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { useRowLabel } from "#lib/row.ts";

// The label is part of the atom so the hit area is the whole line at the floor.
// With none, the `DefinitionRow` it is the value of names it by the row's label.
export type CheckboxProps = Closed & {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label?: string;
};

export function Checkbox(props: CheckboxProps) {
	const rowLabel = useRowLabel();
	return (
		<CheckboxPrimitive.Root
			checked={props.checked}
			onChange={props.onChange}
			class={cn(
				"relative flex min-h-floor w-full cursor-pointer items-center gap-row",
				props.label ? "justify-between" : "justify-end",
			)}
		>
			<CheckboxPrimitive.Input
				class="peer"
				aria-labelledby={props.label ? undefined : rowLabel}
			/>
			<Show when={props.label}>
				<CheckboxPrimitive.Label class={text({ role: "body" })}>
					{props.label}
				</CheckboxPrimitive.Label>
			</Show>
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
