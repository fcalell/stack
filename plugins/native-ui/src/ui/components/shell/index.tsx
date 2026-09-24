import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import { HAIRLINE, place } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Glyph } from "../../lib/glyph";
import { useIcon } from "../../lib/icons";
import { navigate, usePathname } from "../../lib/navigate";
import { dismissToast, useToasts } from "../../lib/toast";
import { Count } from "../count";
import { Toast } from "../toast";

export interface ShellProps extends Closed {
	places: readonly PlaceSpec<string>[];
	banner?: ReactNode;
	children?: ReactNode;
}

// The frame: the banner under the top, the content, the toast queue above
// the bar, and the system-style tab bar with a hairline, icon over label and
// a count where a place has one.
export function Shell({ places, banner, children }: ShellProps) {
	const insets = useSafeAreaInsets();
	const pathname = usePathname();
	const toasts = useToasts();
	return (
		<View className="flex-1 bg-canvas">
			{banner ? <View style={{ paddingTop: insets.top }}>{banner}</View> : null}
			<View className="flex-1">{children}</View>
			{toasts.length > 0 ? (
				<View
					pointerEvents="box-none"
					className="absolute inset-x-0 bottom-0 items-center gap-row p-inset"
				>
					{toasts.map((entry) => (
						<Pressable key={entry.id} onPress={() => dismissToast(entry.id)}>
							<Toast sentence={entry.sentence} act={entry.act} />
						</Pressable>
					))}
				</View>
			) : null}
			<View
				accessibilityRole="tablist"
				style={{ paddingBottom: insets.bottom }}
				className={cn("flex-row border-t bg-canvas", HAIRLINE)}
			>
				{places.map((spec) => (
					<PlaceTab
						key={spec.route}
						spec={spec}
						selected={
							pathname === spec.route || pathname.startsWith(`${spec.route}/`)
						}
					/>
				))}
			</View>
		</View>
	);
}

function PlaceTab({
	spec,
	selected,
}: {
	spec: PlaceSpec<string>;
	selected: boolean;
}) {
	const state = selected ? "selected" : "idle";
	return (
		<Pressable
			accessibilityRole="tab"
			accessibilityState={{ selected }}
			accessibilityLabel={spec.label}
			onPress={() => navigate(spec.route)}
			className="min-h-11 flex-1 items-center gap-pair py-row"
		>
			<View className="flex-row items-start">
				<Glyph
					icon={useIcon(spec.icon)}
					tone={selected ? "accent" : "ink-meta"}
					size={24}
				/>
				{spec.count !== undefined && spec.count > 0 ? (
					<Count value={spec.count} />
				) : null}
			</View>
			<RNText className={place({ state })}>{spec.label}</RNText>
		</Pressable>
	);
}
