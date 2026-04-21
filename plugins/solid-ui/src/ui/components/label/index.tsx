import { Polymorphic, type PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

type LabelProps = {
	class?: string;
};

function Label<T extends ValidComponent = "label">(
	props: PolymorphicProps<T, LabelProps>,
) {
	const [local, rest] = splitProps(props as LabelProps, ["class"]);
	return (
		<Polymorphic
			as="label"
			class={cn(
				"flex flex-row items-center gap-2 text-xs font-bold uppercase leading-snug tracking-widest text-muted-foreground select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
				local.class,
			)}
			{...rest}
		/>
	);
}

export type { LabelProps };
export { Label };
