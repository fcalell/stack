import type { LucideIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "../../lib/cn";
import { useTokenColor } from "../../lib/theme";

export interface TabBarItem {
	key: string;
	label: string;
	// The bar renders the glyph itself and resolves the active/inactive ink.
	icon?: LucideIcon;
}

export interface TabBarProps {
	tabs: TabBarItem[];
	active: string;
	onChange: (key: string) => void;
	className?: string;
}

// Bottom tab bar for the four trip tabs (Oggi · Rotta · Cambusa · Soldi). Active
// vs inactive reads through ink weight (ink-1 vs ink-2), not hue. Respects the
// home-indicator safe-area inset.
export function TabBar({ tabs, active, onChange, className }: TabBarProps) {
	const insets = useSafeAreaInsets();
	const ink1 = useTokenColor("--color-ink-1");
	const ink2 = useTokenColor("--color-ink-2");
	return (
		<View
			style={{ paddingBottom: insets.bottom }}
			className={cn("flex-row border-t border-edge bg-canvas", className)}
		>
			{tabs.map((tab) => {
				const isActive = tab.key === active;
				return (
					<Pressable
						key={tab.key}
						accessibilityRole="tab"
						accessibilityState={{ selected: isActive }}
						onPress={() => onChange(tab.key)}
						className="flex-1 items-center gap-1 py-2"
					>
						{tab.icon ? (
							<tab.icon size={24} color={isActive ? ink1 : ink2} />
						) : null}
						<Text
							className={cn(
								"text-micro",
								isActive ? "text-ink-1" : "text-ink-2",
							)}
						>
							{tab.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}
