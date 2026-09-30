import { ActivityIndicator } from "react-native";

// The busy ring `Spinner` and a busy `Button` draw, in a color resolved from
// their tone.
export function BusyGlyph({
	color,
	label,
}: {
	color: string | undefined;
	label?: string;
}) {
	return <ActivityIndicator color={color} accessibilityLabel={label} />;
}
