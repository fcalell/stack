import { text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Linking, Text as RNText } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";

export interface LinkProps extends Closed {
	href: string;
	children?: ReactNode;
}

// Inline, inside body or meta; never a screen's only act.
export function Link({ href, children }: LinkProps) {
	return (
		<RNText
			accessibilityRole="link"
			className={cn(text({ role: "body" }), "text-tint underline")}
			onPress={() => {
				Linking.openURL(href);
			}}
		>
			{children}
		</RNText>
	);
}
