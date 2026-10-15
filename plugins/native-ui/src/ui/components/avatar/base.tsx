import { avatar, avatarLabel, avatarStep } from "@fcalell/ui-core/variants";
import { useState } from "react";
import { Image, Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { inertProps, paintBox, useShown } from "../../lib/paint";

const CIRCLE = "items-center justify-center overflow-hidden";

function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? "")
		.join("");
}

// The image, else (none, or one that failed to load) the name's initials on
// the fill step its hash picks, so one name keeps one fill. `painted` is the
// circle while its person is not here: its box filled, nothing drawn in it.
// Outside the package's exports.
export function AvatarBase({
	name,
	src,
	painted,
}: {
	name: string;
	src?: string;
	painted?: boolean;
}) {
	const [failed, setFailed] = useState<string>();
	const shown = useShown(painted);
	const step = avatarStep(name);
	if (painted)
		return (
			<View
				{...inertProps(true)}
				className={cn(avatar(), CIRCLE, paintBox(shown))}
			/>
		);
	// Keyed by the URL that failed, so a new src is tried again.
	if (src && src !== failed)
		return (
			<Image
				source={{ uri: src }}
				accessible
				accessibilityRole="image"
				accessibilityLabel={name}
				accessibilityIgnoresInvertColors
				onError={() => setFailed(src)}
				className={avatar()}
			/>
		);
	return (
		<View
			accessible
			accessibilityRole="image"
			accessibilityLabel={name}
			className={cn(avatar({ step }), CIRCLE)}
		>
			<RNText className={avatarLabel({ step })}>{initials(name)}</RNText>
		</View>
	);
}
