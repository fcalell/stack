import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed";

export interface SplitProps extends Closed {
	list?: ReactNode;
	main?: ReactNode;
	pane?: ReactNode;
}

// The desktop's columns; the phone sees one slot at a time, the deepest
// present, so a screen pushes over its list.
export function Split({ list, main, pane }: SplitProps) {
	return <>{pane ?? main ?? list ?? null}</>;
}
