import { rhythm } from "@fcalell/ui-core/variants";
import type { JSX } from "solid-js";
import { cn } from "#lib/cn";

type StackProps = {
	children?: JSX.Element;
	class?: never;
	style?: never;
	classList?: never;
};

// A column of stacked units, gapped at the stack rung. Display and direction
// are the web overlay; the gap is the shared RHYTHM cell.
function Stack(props: StackProps) {
	return (
		<div class={cn(rhythm({ unit: "stack" }), "flex flex-col")}>
			{props.children}
		</div>
	);
}

export type { StackProps };
export { Stack };
