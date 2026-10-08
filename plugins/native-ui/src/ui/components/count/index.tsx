import { COUNT, COUNT_LABEL } from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Text as RNText } from "react-native";
import { InAct } from "../../lib/act-ink";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useInk } from "../../lib/ink";
import { useTokenColor } from "../../lib/theme";

export interface CountProps extends Closed {
	value: number;
}

// A number in the muted ink, its figures at one width. In a `Button` it draws
// in the act's ink: a text takes no currentColor, so the ink the button
// provides (`Ink`) is resolved and set.
export function Count({ value }: CountProps) {
	const inAct = useContext(InAct);
	const color = useTokenColor(`--color-${useInk() ?? "ink-meta"}`);
	return (
		<RNText
			className={inAct ? COUNT_LABEL : cn(COUNT, COUNT_LABEL)}
			style={inAct ? { color } : undefined}
		>
			{value}
		</RNText>
	);
}
