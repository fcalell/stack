import { Text, View, type ViewProps } from "react-native";
import { cn } from "#lib/cn";

// Identity tints — colour encodes WHO, never persona/role. Theme-invariant by
// design (a person's colour is the same in light and Notturno), so these are
// fixed hex, not theme tokens. White label reads on every tint. The gradient
// `navy` tint in the design degrades to its solid azure stop on native.
export type AvatarTint = "navy" | "green" | "sea" | "slate" | "clay" | "gray";

const TINTS: Record<AvatarTint, string> = {
	navy: "#2A6FDB",
	green: "#2A8C5F",
	sea: "#2E7D8A",
	slate: "#42618C",
	clay: "#C76A4A",
	gray: "#7A8593",
};

export interface AvatarProps extends Omit<ViewProps, "children"> {
	initials?: string;
	size?: number;
	// Identity colour. Omit for a neutral placeholder (e.g. an empty seat / add).
	tint?: AvatarTint;
}

export function Avatar({
	initials,
	size = 40,
	tint,
	className,
	style,
	...rest
}: AvatarProps) {
	const tinted = tint !== undefined;
	return (
		<View
			style={[
				{ width: size, height: size },
				tinted ? { backgroundColor: TINTS[tint] } : null,
				style,
			]}
			className={cn(
				"items-center justify-center rounded-full",
				tinted ? "" : "border border-edge bg-surface",
				className,
			)}
			{...rest}
		>
			{initials ? (
				<Text
					style={{ fontSize: Math.round(size * 0.4) }}
					className={cn("font-bold", tinted ? "text-white" : "text-ink-2")}
				>
					{initials}
				</Text>
			) : null}
		</View>
	);
}
