import { cn } from "@fcalell/ui-core/cn";
import { GROUP } from "@fcalell/ui-core/variants";
import type { ReactNode, RefObject } from "react";

const BOX = "shrink-0 overflow-hidden";

// A divided sheet's, a form group's and a docked sheet's hairline is a
// pseudo-element on each row but the last, not the row's border, so it runs
// straight across the row's whole width under a rounded wash.
export const DIVIDER =
	"[&>:not(:last-child)]:relative [&>:not(:last-child)]:after:absolute [&>:not(:last-child)]:after:inset-x-0 [&>:not(:last-child)]:after:bottom-0 [&>:not(:last-child)]:after:h-px [&>:not(:last-child)]:after:bg-edge";

// A tree's hairline is the divided sheet's, starting at the rail of the row
// under it (`--rule-depth`, which a tree row sets on itself from the row under
// it): past the row's inset, less the hairline so the line meets the rail's
// top, and one indent per level. Under a row a root follows, unset, it runs
// whole.
export const TREE_DIVIDER =
	"[&>:not(:last-child)]:relative [&>:not(:last-child)]:after:absolute [&>:not(:last-child)]:after:end-0 [&>:not(:last-child)]:after:start-[calc(min(var(--rule-depth,0),1)*(var(--spacing-pad)-var(--spacing-hairline))+var(--rule-depth,0)*var(--spacing-indent))] [&>:not(:last-child)]:after:bottom-0 [&>:not(:last-child)]:after:h-px [&>:not(:last-child)]:after:bg-edge";

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
