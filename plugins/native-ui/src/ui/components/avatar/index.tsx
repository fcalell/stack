import { avatar, avatarLabel, avatarStep } from "@fcalell/ui-core/variants";
import { useState } from "react";
import { Image, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";

const CIRCLE = "items-center justify-center overflow-hidden";

export interface AvatarProps extends Closed {
	/** The person's name: the accessible name, and the initials of its first two words without an image (a short phrase; only the initials draw). */
	name: string;
	src?: string;
}

function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? "")
		.join("");
}

// The image, else (none, or one that failed to load) the name's initials on
// the fill step its hash picks, so one name keeps one fill.
export function Avatar({ name, src }: AvatarProps) {
	const [failed, setFailed] = useState<string>();
	const step = avatarStep(name);
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
