import { cn } from "@fcalell/ui-core/cn";
import { GROUP } from "@fcalell/ui-core/variants";
import type { ReactNode, RefObject } from "react";

const BOX = "shrink-0 overflow-hidden";

// A divided sheet's, a form group's and a docked sheet's hairline is a
// pseudo-element on each row but the last, not the row's border, so it runs
// straight across the row's whole width under a rounded wash.
export const DIVIDER =
	"[&>:not(:last-child)]:relative [&>:not(:last-child)]:after:absolute [&>:not(:last-child)]:after:inset-x-0 [&>:not(:last-child)]:after:bottom-0 [&>:not(:last-child)]:after:h-px [&>:not(:last-child)]:after:bg-edge";

/** The hairline card every Section's rows stand on: the box its entries window in when they are many. Outside the package's exports. */
export function SheetCard(props: {
	box?: RefObject<HTMLDivElement | null>;
	children: ReactNode;
}) {
	return (
		<div ref={props.box} className={cn(GROUP, BOX, DIVIDER)}>
			{props.children}
		</div>
	);
}
