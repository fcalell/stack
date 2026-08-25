import * as CheckboxPrimitive from "@kobalte/core/checkbox";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Minus } from "lucide-solid";
import type { ValidComponent } from "solid-js";
import { Match, Show, Switch, splitProps } from "solid-js";

const checkboxVariants = cva(
	"shrink-0 rounded-md border border-ink-1 disabled:cursor-not-allowed disabled:opacity-50 peer-focus-visible:outline-2 peer-focus-visible:outline-interactive peer-focus-visible:outline-offset-2 data-checked:border-none data-checked:bg-accent data-checked:text-accent-ink data-indeterminate:border-none data-indeterminate:bg-accent data-indeterminate:text-accent-ink",
	{
		variants: {
			size: {
				sm: "size-3.5 [&_svg]:size-3.5",
				default: "size-4 [&_svg]:size-4",
				lg: "size-5 [&_svg]:size-5",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

type CheckboxProps<T extends ValidComponent = "div"> =
	CheckboxPrimitive.CheckboxRootProps<T> &
		VariantProps<typeof checkboxVariants> & {
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
			<CheckboxPrimitive.Control class={checkboxVariants({ size: local.size })}>
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
export { Checkbox, checkboxVariants };
