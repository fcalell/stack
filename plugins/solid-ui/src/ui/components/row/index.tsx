import { rhythm } from "@fcalell/ui-core/variants";
import type { JSX } from "solid-js";
import { cn } from "#lib/cn";

type RowProps = {
	children?: JSX.Element;
	wrap?: boolean;
	class?: never;
	style?: never;
	classList?: never;
};

// Items in a group, laid inline and gapped at the row rung. A left/right
// split is justify-between geometry, not a Row. `wrap` lets a long group (a
// chip row, a tag cluster) break onto further lines at the same gap.
function Row(props: RowProps) {
	return (
		<div
			class={cn(
				rhythm({ unit: "row" }),
				"flex flex-row items-center",
				props.wrap && "flex-wrap",
			)}
		>
			{props.children}
		</div>
	);
}

export type { RowProps };
export { Row };
