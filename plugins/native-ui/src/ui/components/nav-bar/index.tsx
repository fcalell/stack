import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { cn } from "#lib/cn";

export interface NavBarProps {
	title: string;
	// Back affordance — pass an IconButton; the leading slot reserves its width.
	leading?: ReactNode;
	trailing?: ReactNode;
	// Centre the title (no leading/trailing imbalance). Defaults to left-aligned.
	center?: boolean;
	className?: string;
}

// Compact header for pushed screens: back · title · action. The title takes the
// remaining width and truncates to one line.
export function NavBar({
	title,
	leading,
	trailing,
	center,
	className,
}: NavBarProps) {
	return (
		<View
			className={cn(
				"min-h-12 flex-row items-center gap-2.5 px-3.5 py-2",
				className,
			)}
		>
			{leading}
			<Text
				numberOfLines={1}
				className={cn(
					"flex-1 text-lg font-extrabold text-ink-1",
					center && "text-center",
				)}
			>
				{title}
			</Text>
			{trailing}
		</View>
	);
}
