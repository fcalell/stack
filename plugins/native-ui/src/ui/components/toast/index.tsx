import type { Act } from "@fcalell/ui-core/descriptors";
import { TOAST } from "@fcalell/ui-core/variants";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { toast, useToasts } from "../../lib/toast";

export interface ToastProps extends Closed {
	sentence: string;
	act?: Act;
}

// The dark pill above the bar. Client-owned, so never an undo. `toast()`
// queues one; the Shell renders the queue.
export function Toast({ sentence, act }: ToastProps) {
	return (
		<View
			accessibilityLiveRegion="polite"
			className={cn(TOAST, "flex-row items-center self-center shadow-float")}
		>
			<RNText className={cn(TOAST, "shrink px-0 py-0")}>{sentence}</RNText>
			{act ? (
				<Pressable
					accessibilityRole="button"
					onPress={act.onAct}
					className="min-h-11 justify-center"
				>
					<RNText className={cn(TOAST, "px-0 py-0 font-medium")}>
						{act.label}
					</RNText>
				</Pressable>
			) : null}
		</View>
	);
}

export { toast, useToasts };
