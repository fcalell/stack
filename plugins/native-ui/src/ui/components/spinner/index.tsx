import type { ContentTone } from "@fcalell/ui-core/variants";
import { ActivityIndicator, type ActivityIndicatorProps } from "react-native";
import { useTokenColor } from "../../lib/theme";

export interface SpinnerProps extends Omit<ActivityIndicatorProps, "color"> {
	// The content tone the glyph spins in, resolved against the active theme.
	// A busy Button passes its own label tone through `buttonContentTone`.
	tone?: ContentTone;
}

// Inline activity indicator. No full-screen spinner — prefer Skeleton for page
// loads; use this inside a busy button (OAuth hand-off).
export function Spinner({ tone, size = "small", ...rest }: SpinnerProps) {
	const color = useTokenColor(`--color-${tone ?? "ink-1"}`);
	return <ActivityIndicator color={color} size={size} {...rest} />;
}
