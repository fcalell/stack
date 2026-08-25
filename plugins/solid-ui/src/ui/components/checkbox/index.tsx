import { CONTROL_MUTED, checkbox } from "@fcalell/ui-core/variants";
import * as CheckboxPrimitive from "@kobalte/core/checkbox";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { Check, Minus } from "lucide-solid";
import type { ValidComponent } from "solid-js";
import { Match, Show, Switch, splitProps } from "solid-js";
import { cn } from "#lib/cn";

// Selector duplicates of the CHECKBOX checked cells: Kobalte owns the checked
// state (uncontrolled included), so the cells ride data-* selectors instead of
// a prop-computed call. `data-disabled:` because the Control is a div and
// `:disabled` never matches it; the disabled fade itself is a conditional
// CONTROL_MUTED call, since `disabled` is our own prop.
const STATE_OVERLAY =
	"data-checked:border-none data-checked:bg-accent data-checked:text-accent-ink data-indeterminate:border-none data-indeterminate:bg-accent data-indeterminate:text-accent-ink data-disabled:cursor-not-allowed peer-focus-visible:outline-2 peer-focus-visible:outline-interactive peer-focus-visible:outline-offset-2";

type CheckboxSize = "sm" | "md" | "lg";

// Sized to this plugin's own glyph, which is why it stays out of the matrix.
const SIZE: Record<CheckboxSize, string> = {
	sm: "size-3.5 [&_svg]:size-3.5",
	md: "size-4 [&_svg]:size-4",
	lg: "size-5 [&_svg]:size-5",
};

type CheckboxProps<T extends ValidComponent = "div"> =
	CheckboxPrimitive.CheckboxRootProps<T> & {
		size?: CheckboxSize;
		label?: string;
		class?: never;
		style?: never;
		classList?: never;
	};

function Checkbox<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, CheckboxProps<T>>,
) {
	const [local, rest] = splitProps(props as CheckboxProps, ["size", "label"]);
	return (
		<CheckboxPrimitive.Root
			class="group relative flex items-start gap-2"
			{...rest}
		>
			<CheckboxPrimitive.Input class="peer" />
			<CheckboxPrimitive.Control
				class={cn(
					checkbox(),
					SIZE[local.size ?? "md"],
					"shrink-0",
					STATE_OVERLAY,
					(props as CheckboxProps).disabled && CONTROL_MUTED,
				)}
			>
				<CheckboxPrimitive.Indicator>
					<Switch>
						<Match when={!rest.indeterminate}>
							<Check />
						</Match>
						<Match when={rest.indeterminate}>
							<Minus />
						</Match>
					</Switch>
				</CheckboxPrimitive.Indicator>
			</CheckboxPrimitive.Control>
			<Show when={local.label}>
				<CheckboxPrimitive.Label class="select-none text-callout">
					{local.label}
				</CheckboxPrimitive.Label>
			</Show>
		</CheckboxPrimitive.Root>
	);
}

export type { CheckboxProps };
export { Checkbox };
