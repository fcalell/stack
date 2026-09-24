import type { IconAct } from "@fcalell/ui-core/descriptors";
import { HAIRLINE, text } from "@fcalell/ui-core/variants";
import { ChevronLeft } from "lucide-react-native";
import { Children, isValidElement, type ReactNode, useState } from "react";
import { Text as RNText, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Circle } from "../../lib/circle";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Scroll } from "../../lib/hosts";
import { navigate } from "../../lib/navigate";
import { useWords } from "../../lib/words";
import { ActionBar } from "../action-bar";
import { IconButton } from "../icon-button";

export interface ScreenProps extends Closed {
	title: string;
	back?: string;
	actions?: IconAct<string>[];
	children?: ReactNode;
}

// The large title scrolls away and the top bar takes it compact.
const COMPACT_AT = 48;

// A pushed screen: the top bar with the back circle and the compact title,
// the side inset, the scroll. A pinned ActionBar child sits above the home
// indicator; the screen lifts it out of the scroll itself.
export function Screen({ title, back, actions, children }: ScreenProps) {
	const insets = useSafeAreaInsets();
	const words = useWords();
	const [compact, setCompact] = useState(false);
	const all = Children.toArray(children);
	const bar = all.find(
		(child) => isValidElement(child) && child.type === ActionBar,
	);
	const body = all.filter((child) => child !== bar);
	return (
		<View className="flex-1 bg-canvas">
			<View
				style={{ paddingTop: insets.top }}
				className="min-h-11 flex-row items-center gap-row px-inset"
			>
				{back !== undefined ? (
					<Circle
						icon={ChevronLeft}
						label={words.back}
						onAct={() => navigate(back)}
					/>
				) : null}
				<RNText
					numberOfLines={1}
					className={cn(
						text({ role: "heading" }),
						"flex-1",
						!compact && "opacity-0",
					)}
				>
					{title}
				</RNText>
				{(actions ?? []).map((action) => (
					<IconButton key={action.label} {...action} />
				))}
			</View>
			<Scroll
				className="flex-1"
				contentContainerClassName="gap-section px-inset pb-section"
				scrollEventThrottle={32}
				onScroll={(event) =>
					setCompact(event.nativeEvent.contentOffset.y > COMPACT_AT)
				}
			>
				<RNText className={text({ role: "title" })}>{title}</RNText>
				{body}
			</Scroll>
			{bar ? (
				<View
					style={{ paddingBottom: insets.bottom + 8 }}
					className={cn("border-t bg-canvas px-inset pt-stack", HAIRLINE)}
				>
					{bar}
				</View>
			) : null}
		</View>
	);
}
