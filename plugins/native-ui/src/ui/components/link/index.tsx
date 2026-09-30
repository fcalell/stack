import { type LinkFit, link, text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Linking, Text as RNText } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";

// Inline is underlined at rest and plain under the press; standalone the
// other way round, its box kept to its words in a stretching parent. An
// inline link is a run of its line and takes the line's type, as a nested
// Text inherits; a standalone one has no line to inherit from, so it sets
// the body role.
const OVERLAY: Record<LinkFit, string> = {
	inline: "active:no-underline",
	standalone: "self-start active:underline",
};

export interface LinkProps extends Closed {
	href: string;
	fit?: LinkFit;
	children?: ReactNode;
}

// A navigation to another place, in accent ink.
export function Link({ href, fit, children }: LinkProps) {
	const place = fit ?? "inline";
	return (
		<RNText
			accessibilityRole="link"
			className={cn(
				place === "standalone" && text({ role: "body" }),
				link({ fit: place }),
				OVERLAY[place],
			)}
			onPress={() => {
				Linking.openURL(href);
			}}
		>
			{children}
		</RNText>
	);
}
