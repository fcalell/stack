import { avatar, avatarStep, text } from "@fcalell/ui-core/variants";
import { Image, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";

export interface AvatarProps extends Closed {
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

// A circle: the image, else the name's initials on the ladder step its hash
// picks, so one name keeps one fill.
export function Avatar({ name, src }: AvatarProps) {
	return (
		<View
			accessibilityLabel={name}
			className={cn(
				avatar({ step: avatarStep(name) }),
				"size-8 items-center justify-center overflow-hidden",
			)}
		>
			{src ? (
				<Image
					source={{ uri: src }}
					className="size-8"
					accessibilityIgnoresInvertColors
				/>
			) : (
				<RNText className={cn(text({ role: "label" }), "text-ink")}>
					{initials(name)}
				</RNText>
			)}
		</View>
	);
}
