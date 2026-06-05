import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "#lib/cn";

export interface FootbarProps {
	children: ReactNode;
	className?: string;
}

// Sticky wizard action bar pinned below the scroll. Holds a ghost "Salva bozza"
// + the step's primary (flex-1). Bottom padding clears the home indicator;
// keep the primary enabled and validate on tap — never park a dead disabled CTA.
export function Footbar({ children, className }: FootbarProps) {
	const insets = useSafeAreaInsets();
	return (
		<View
			style={{ paddingBottom: insets.bottom + 12 }}
			className={cn(
				"flex-row items-center gap-3 border-t border-edge bg-canvas px-4 pt-3",
				className,
			)}
		>
			{children}
		</View>
	);
}
