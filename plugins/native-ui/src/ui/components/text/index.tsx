import { type TextRole, text, textStrong } from "@fcalell/ui-core/variants";
import { createContext, type ReactNode, useContext } from "react";
import { Text as RNText } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";

// The role of the line a Text sits in, unset outside one.
const Line = createContext<TextRole | undefined>(undefined);

export interface TextProps extends Closed {
	role?: TextRole;
	strong?: boolean;
	children?: ReactNode;
}

// The only way to set type; ink and family ride with the role, and `strong`
// is weight 500, never a size. A nested Text is a run of its line: it takes
// the line's role and inherits its look, adding only the weight.
export function Text({ role, strong, children }: TextProps) {
	const line = useContext(Line);
	const drawn = line ?? role ?? "body";
	const weight = strong ? textStrong({ role: drawn }) : undefined;
	if (line) return <RNText className={weight}>{children}</RNText>;
	return (
		<Line.Provider value={drawn}>
			<RNText className={cn(text({ role: drawn }), weight)}>{children}</RNText>
		</Line.Provider>
	);
}
