import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SeparatorPrimitive from "@kobalte/core/separator";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";
import { separatorClass } from "#lib/separator";

type SeparatorProps<T extends ValidComponent = "hr"> =
	SeparatorPrimitive.SeparatorRootProps<T> & {
		class?: never;
		style?: never;
		classList?: never;
	};

function Separator<T extends ValidComponent = "hr">(
	props: PolymorphicProps<T, SeparatorProps<T>>,
) {
	const [local, rest] = splitProps(props as SeparatorProps, ["orientation"]);
	return (
		<SeparatorPrimitive.Root
			orientation={local.orientation ?? "horizontal"}
			class={cn(
				separatorClass,
				local.orientation === "vertical" && "h-full w-px",
			)}
			{...rest}
		/>
	);
}

export type { SeparatorProps };
export { Separator };
