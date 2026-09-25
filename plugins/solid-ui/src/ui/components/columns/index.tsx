import { rhythm } from "@fcalell/ui-core/variants";
import type { JSX } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { ColumnsContext } from "#lib/columns.ts";
import { useWholeWidth } from "#lib/measure.ts";

// The same sections side by side, each a column wide, scrolling sideways past
// the width; a `ListRow` inside is drawn as a card. Under desktop the sections
// stack. Inside a `Place` the columns take the whole column, never the
// reading width.
export type ColumnsProps = Closed & { children?: JSX.Element };

export function Columns(props: ColumnsProps) {
	useWholeWidth();
	return (
		<ColumnsContext.Provider value={true}>
			<div
				class={cn(
					rhythm({ unit: "section" }),
					"flex flex-col desktop:flex-row desktop:items-start desktop:overflow-x-auto desktop:*:w-column desktop:*:shrink-0",
				)}
			>
				{props.children}
			</div>
		</ColumnsContext.Provider>
	);
}
