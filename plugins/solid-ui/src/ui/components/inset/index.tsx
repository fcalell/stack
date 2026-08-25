import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

type InsetProps = ComponentProps<"div"> & {
	tone?: "neutral" | "danger";
	class?: never;
	style?: never;
	classList?: never;
};

function Inset(props: InsetProps) {
	const [local, rest] = splitProps(props, ["tone", "children"]);
	return (
		<div
			class={cn(
				"flex flex-col gap-3 border-l-2 pl-4",
				local.tone === "danger" ? "border-danger" : "border-edge",
			)}
			{...rest}
		>
			{local.children}
		</div>
	);
}

export type { InsetProps };
export { Inset };
