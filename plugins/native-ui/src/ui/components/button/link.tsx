import { LINK_TARGET, link, text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Pressable, Text as RNText } from "react-native";
import { cn } from "../../lib/cn";
import { open, useWarm } from "../../lib/navigate";

// Inline is underlined at rest and plain under the press; on its own the
// other way round. An inline link is a run of its line and takes the line's
// type, as a nested Text inherits; one on its own has no line to inherit
// from, so it sets the body role.
const INLINE = "active:no-underline";
// A link on its own is the target-high pressable, its box kept to its words
// in a stretching parent and the words centred in it: a text's own box takes
// the touch only where its words are.
const BOX = "justify-center self-start";

// A navigation to another place, in accent ink: a route of the app (navigated
// through the router) or an external URL (opened by the OS). Its words are
// the `label` or the `children` (a markdown link's runs). Outside the
// package's exports: the Button draws it, or a molecule whose words are nodes.
export function ButtonLink({
	href,
	fit,
	label,
	children,
}: {
	href: string;
	fit?: "body" | "inline";
	label?: string;
	children?: ReactNode;
}) {
	const warm = useWarm();
	const words = children ?? label;
	if (fit !== "inline")
		return (
			<Pressable
				accessibilityRole="link"
				onPressIn={() => warm(href)}
				onPress={() => open(href)}
				className={cn(LINK_TARGET, BOX)}
			>
				{({ pressed }) => (
					<RNText
						className={cn(
							text({ role: "body" }),
							link({ fit: "standalone" }),
							pressed && "underline",
						)}
					>
						{words}
					</RNText>
				)}
			</Pressable>
		);
	return (
		<RNText
			accessibilityRole="link"
			className={cn(link({ fit: "inline" }), INLINE)}
			onPressIn={() => warm(href)}
			onPress={() => open(href)}
		>
			{words}
		</RNText>
	);
}
