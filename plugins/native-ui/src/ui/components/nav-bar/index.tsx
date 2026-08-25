import type { Action } from "@fcalell/ui-core/descriptors";
import { ChevronLeft, X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { cn } from "../../lib/cn";
import { useTokenColor } from "../../lib/theme";

export interface NavBarProps {
	title: string;
	// Renders the bar's own back affordance: a chevron, or an X for modal flows.
	onBack?: () => void;
	backVariant?: "back" | "close";
	// The bar renders the action as its own internal pressable text: a Button's
	// min-h-11 plus the bar's py-2 would grow the 48px bar to 60. `loading`
	// dims and disables it.
	action?: Action<never>;
	// Centre the title (no leading/trailing imbalance). Defaults to left-aligned.
	center?: boolean;
	className?: never;
	style?: never;
}

// Compact header for pushed screens: back · title · action. The title takes the
// remaining width and truncates to one line.
export function NavBar({
	title,
	onBack,
	backVariant = "back",
	action,
	center,
}: NavBarProps) {
	const ink1 = useTokenColor("--color-ink-1");
	const BackGlyph = backVariant === "close" ? X : ChevronLeft;
	const actionIdle = action ? !(action.disabled || action.loading) : false;
	return (
		<View className="min-h-12 flex-row items-center gap-2.5 px-3.5 py-2">
			{onBack ? (
				// The 24px glyph plus 10 of hitSlop each side lands on the 44pt
				// floor (the stepper precedent).
				<Pressable accessibilityRole="button" hitSlop={10} onPress={onBack}>
					<BackGlyph size={24} color={ink1} />
				</Pressable>
			) : null}
			<Text
				numberOfLines={1}
				className={cn(
					"flex-1 text-h3 font-bold text-ink-1",
					center && "text-center",
				)}
			>
				{title}
			</Text>
			{action ? (
				<Pressable
					accessibilityRole="button"
					hitSlop={12}
					disabled={!actionIdle}
					onPress={action.onSelect}
					className={cn(!actionIdle && "opacity-40")}
				>
					<Text className="text-callout font-semibold text-interactive">
						{action.label}
					</Text>
				</Pressable>
			) : null}
		</View>
	);
}
