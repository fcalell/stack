import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

type InsetProps = ComponentProps<"div"> & {
	variant?: "default" | "error";
};

function Inset(props: InsetProps) {
	const [local, rest] = splitProps(props, ["class", "variant", "children"]);
	return (
		<div
			class={cn(
				"flex flex-col gap-3 border-l-2 pl-4",
				local.variant === "error" ? "border-destructive" : "border-border",
				local.class,
			)}
			{...rest}
		>
			{local.children}
		</div>
	);
}

export type { InsetProps };
export { Inset };
