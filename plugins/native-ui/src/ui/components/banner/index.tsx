import type { Act } from "@fcalell/ui-core/descriptors";
import { type BannerKind, banner, text } from "@fcalell/ui-core/variants";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";

export interface BannerProps extends Closed {
	kind?: BannerKind;
	sentence: string;
	act?: Act;
}

// Full width under the top bar on the kind's soft fill: the shell's for the
// app's state, a screen's or a sheet's for its own.
export function Banner({ kind, sentence, act }: BannerProps) {
	return (
		<View
			accessibilityRole="alert"
			className={cn(banner({ kind: kind ?? "note" }), "flex-row items-center")}
		>
			<RNText
				className={cn(banner({ kind: kind ?? "note" }), "flex-1 px-0 py-0")}
			>
				{sentence}
			</RNText>
			{act ? (
				<Pressable
					accessibilityRole="button"
					disabled={act.blocked !== undefined}
					onPress={act.onAct}
					className="min-h-11 justify-center"
				>
					<RNText
						className={cn(text({ role: "meta" }), "font-medium text-ink")}
					>
						{act.label}
					</RNText>
				</Pressable>
			) : null}
		</View>
	);
}
