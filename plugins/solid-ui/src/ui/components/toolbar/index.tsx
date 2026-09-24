import { rhythm } from "@fcalell/ui-core/variants";
import type { JSX } from "solid-js";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";

// One row of controls over a list: a picker, a segmented control, a search
// field, a switch.
export type ToolbarProps = Closed & { children?: JSX.Element };

export function Toolbar(props: ToolbarProps) {
	return (
		<div class={cn(rhythm({ unit: "row" }), "flex flex-wrap items-center")}>
			{props.children}
		</div>
	);
}
