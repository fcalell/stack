import { rhythm } from "@fcalell/ui-core/variants";
import type { JSX } from "solid-js";
import { cn } from "#lib/cn";

type PairProps = {
	children?: JSX.Element;
	row?: boolean;
	class?: never;
	style?: never;
	classList?: never;
};

// A glued micro-pair (label to control, title to meta), gapped at the pair
// rung. Column by default; `row` lays it inline.
function Pair(props: PairProps) {
	return (
		<div
			class={cn(
				rhythm({ unit: "pair" }),
				props.row ? "flex flex-row items-center" : "flex flex-col",
			)}
		>
			{props.children}
		</div>
	);
}

export type { PairProps };
export { Pair };
