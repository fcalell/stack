import type { Act } from "@fcalell/ui-core/descriptors";
import {
	statusContentTone,
	TOAST,
	type ToastState,
	text,
} from "@fcalell/ui-core/variants";
import {
	CircleAlert,
	CircleCheck,
	CircleX,
	type LucideIcon,
} from "lucide-react-native";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Glyph } from "../../lib/glyph";
import { toast, useToasts } from "../../lib/toast";

// The glyph of each state a toast reports.
const STATE_MARK: Record<ToastState, LucideIcon> = {
	done: CircleCheck,
	attention: CircleAlert,
	failed: CircleX,
};

export interface ToastProps extends Closed {
	sentence: string;
	state?: ToastState;
	act?: Act;
}

// A raised toast above the bar. Client-owned, so never an undo. With
// `state` it reports how an act ended: the state's glyph in its ink.
// `toast()` queues one; the Shell renders the queue.
export function Toast({ sentence, state, act }: ToastProps) {
	return (
		<View
			accessibilityLiveRegion="polite"
			className={cn(TOAST, "flex-row items-center self-center max-w-full")}
		>
			{state ? (
				<Glyph
					icon={STATE_MARK[state]}
					tone={statusContentTone(state)}
					size={16}
				/>
			) : null}
			<RNText className={cn(text({ role: "body" }), "shrink")}>
				{sentence}
			</RNText>
			{act ? (
				<Pressable
					accessibilityRole="button"
					onPress={act.onAct}
					className="min-h-11 justify-center"
				>
					<RNText className={cn(text({ role: "body" }), "font-medium")}>
						{act.label}
					</RNText>
				</Pressable>
			) : null}
		</View>
	);
}

export { toast, useToasts };
