import { ActivityIndicator, type ActivityIndicatorProps } from "react-native";
import { useCSSVariable } from "#lib/theme";

export interface SpinnerProps extends Omit<ActivityIndicatorProps, "color"> {
	// Defaults to the active theme's ink-1. Pass a token-resolved colour when the
	// spinner sits on a filled surface (e.g. accent-ink inside a busy Button).
	color?: string;
}

// Inline activity indicator. No full-screen spinner — prefer Skeleton for page
// loads; use this inside a busy button (OAuth hand-off).
export function Spinner({ color, size = "small", ...rest }: SpinnerProps) {
	const ink = useCSSVariable("--color-ink-1");
	const fallback = typeof ink === "string" ? ink : undefined;
	return <ActivityIndicator color={color ?? fallback} size={size} {...rest} />;
}
