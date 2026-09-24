import { type TextRole, text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText } from "react-native";
import type { Closed } from "../../lib/closed";

export interface TextProps extends Closed {
	role?: TextRole;
	children?: ReactNode;
}

// The only way to set type; ink and family ride with the role.
export function Text({ role, children }: TextProps) {
	return <RNText className={text({ role: role ?? "body" })}>{children}</RNText>;
}
