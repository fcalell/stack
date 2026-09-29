import type { Act, IconAct } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import { Ellipsis } from "lucide-react-native";
import { type ReactNode, useContext, useState } from "react";
import { Text as RNText, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Circle } from "../../lib/circle";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Scroll } from "../../lib/hosts";
import { MoreSheet } from "../../lib/more";
import { SwitcherContext } from "../../lib/switcher";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { IconButton } from "../icon-button";

export interface PlaceProps extends Closed {
	title: string;
	actions?: IconAct<string>[];
	act?: Act;
	// Labelled acts under the more circle, after the actions past two.
	more?: Act[];
	bleed?: boolean;
	children?: ReactNode;
}

// At most two circles in the top bar; the rest open under a more circle.
const BAR_ACTIONS = 2;

// A place in the shell: the large title on the top bar's row beside its
// circles, the side inset, the scroll, and the primary act as a pill
// floating above the tab bar. The shell's `switcher` starts the top bar's row.
// With `bleed` the body is the whole box under the top bar, with no side
// inset and no scroll, so a child that pans or scrolls itself owns it.
export function Place({
	title,
	actions,
	act,
	more: moreActs,
	bleed,
	children,
}: PlaceProps) {
	const insets = useSafeAreaInsets();
	const words = useWords();
	const switcher = useContext(SwitcherContext);
	const [more, setMore] = useState(false);
	const all = actions ?? [];
	const extra = moreActs ?? [];
	const shown =
		all.length > BAR_ACTIONS || extra.length > 0
			? all.slice(0, BAR_ACTIONS - 1)
			: all;
	const rest = all.slice(shown.length);
	const bar = (
		<View className="min-h-11 flex-row items-center gap-inside">
			{switcher}
			<RNText
				accessibilityRole="header"
				numberOfLines={1}
				className={cn(text({ role: "title" }), "flex-1")}
			>
				{title}
			</RNText>
			{shown.map((action) => (
				<IconButton key={action.label} {...action} />
			))}
			{rest.length + extra.length > 0 ? (
				<Circle
					icon={Ellipsis}
					label={words.more}
					onAct={() => setMore(true)}
				/>
			) : null}
		</View>
	);
	return (
		<View className="flex-1 bg-canvas">
			{bleed ? (
				<View className="flex-1" style={{ paddingTop: insets.top }}>
					<View className="px-card">{bar}</View>
					<View className="flex-1 overflow-hidden">{children}</View>
				</View>
			) : (
				<Scroll
					className="flex-1"
					contentContainerClassName="grow gap-sections px-card pb-sections"
					contentContainerStyle={{ paddingTop: insets.top }}
				>
					{bar}
					{children}
				</Scroll>
			)}
			{act ? (
				<View className="absolute right-0 bottom-0 p-card shadow-float">
					<Button act="primary" {...act} />
				</View>
			) : null}
			<MoreSheet
				title={title}
				open={more}
				onClose={() => setMore(false)}
				actions={rest}
				more={extra}
			/>
		</View>
	);
}
