import { cn } from "@fcalell/ui-core/cn";
import { GROUP } from "@fcalell/ui-core/variants";
import type { ReactNode, RefObject } from "react";
import { useSettleName } from "../../lib/settle.ts";

const BOX = "flex flex-col shrink-0 overflow-hidden";

/** The hairline card every Group and its rows stand on: the box its entries window in when they are many. Outside the package's exports. */
export function GroupCard(props: {
	box?: RefObject<HTMLDivElement | null>;
	children: ReactNode;
}) {
	const settle = useSettleName();
	return (
		<div ref={props.box} style={settle} className={cn(GROUP, BOX)}>
			{props.children}
		</div>
	);
}
