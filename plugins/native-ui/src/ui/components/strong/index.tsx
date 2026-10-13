import { textStrong } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText } from "react-native";
import type { Closed } from "../../lib/closed";

export interface StrongProps extends Closed {
	/** The words (text; wraps). */
	children?: ReactNode;
}

// Words at weight 500 inside a `Text`, never a size change: a nested React
// Native Text inherits the line's role, ink and family. Body and meta share
// the weight, so the run reads the line's role from it.
export function Strong({ children }: StrongProps) {
	return <RNText className={textStrong({ role: "body" })}>{children}</RNText>;
}
