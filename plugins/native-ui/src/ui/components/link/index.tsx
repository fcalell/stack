import {
	LINK_TARGET,
	type LinkFit,
	link,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Pressable, Text as RNText } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { open } from "../../lib/navigate";

// Inline is underlined at rest and plain under the press; standalone the
// other way round. An inline link is a run of its line and takes the line's
// type, as a nested Text inherits; a standalone one has no line to inherit
// from, so it sets the body role.
const INLINE = "active:no-underline";
// A standalone link's pressable is the target-high box, its box kept to its
// words in a stretching parent and the words centred in it: a text's own box
// takes the touch only where its words are.
const BOX = "justify-center self-start";

export interface LinkProps extends Closed {
	// A route of the app (navigated through the router) or an external URL
	// (opened by the OS).
	href: string;
	fit?: LinkFit;
	children?: ReactNode;
}

// A navigation to another place, in accent ink.
export function Link({ href, fit, children }: LinkProps) {
	const place = fit ?? "inline";
	if (place === "standalone")
		return (
			<Pressable
				accessibilityRole="link"
				onPress={() => open(href)}
				className={cn(LINK_TARGET, BOX)}
			>
				{({ pressed }) => (
					<RNText
						className={cn(
							text({ role: "body" }),
							link({ fit: place }),
							pressed && "underline",
						)}
					>
						{children}
					</RNText>
				)}
			</Pressable>
		);
	return (
		<RNText
			accessibilityRole="link"
			className={cn(link({ fit: place }), INLINE)}
			onPress={() => open(href)}
		>
			{children}
		</RNText>
	);
}
