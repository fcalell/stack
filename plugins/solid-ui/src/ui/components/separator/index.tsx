import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SeparatorPrimitive from "@kobalte/core/separator";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

type SeparatorProps<T extends ValidComponent = "hr"> =
	SeparatorPrimitive.SeparatorRootProps<T> & { class?: string };

function Separator<T extends ValidComponent = "hr">(
	props: PolymorphicProps<T, SeparatorProps<T>>,
) {
	const [local, rest] = splitProps(props as SeparatorProps, [
		"class",
		"orientation",
	]);
	return (
		<SeparatorPrimitive.Root
			orientation={local.orientation ?? "horizontal"}
			class={cn(
				"shrink-0 bg-border",
				local.orientation === "vertical" ? "h-full w-px" : "h-px w-full",
				local.class,
			)}
			{...rest}
		/>
	);
}

export type { SeparatorProps };
export { Separator };
