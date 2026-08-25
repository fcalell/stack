import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface FootbarProps {
	children: ReactNode;
	className?: never;
	style?: never;
}

// Sticky wizard action bar pinned below the scroll. Holds a tertiary "Salva
// bozza" + the step's primary (flex-1). Bottom padding clears the home indicator;
// keep the primary enabled and validate on tap — never park a dead disabled CTA.
export function Footbar({ children }: FootbarProps) {
	const insets = useSafeAreaInsets();
	return (
		<View
			style={{ paddingBottom: insets.bottom + 12 }}
			className="flex-row items-center gap-3 border-t border-edge bg-canvas px-4 pt-3"
		>
			{children}
		</View>
	);
}
