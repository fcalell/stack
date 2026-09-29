import type { Act } from "@fcalell/ui-core/descriptors";
import {
	statusContentTone,
	TOAST,
	type ToastState,
	toastState,
} from "@fcalell/ui-core/variants";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Glyph } from "../../lib/glyph";
import { toast, useToasts } from "../../lib/toast";
import { STATUS_MARK } from "../status";

export interface ToastProps extends Closed {
	sentence: string;
	state?: ToastState;
	act?: Act;
}

// The dark pill above the bar. Client-owned, so never an undo. With `state`
// it reports how an act ended: the state's glyph on its soft fill. `toast()`
// queues one; the Shell renders the queue.
export function Toast({ sentence, state, act }: ToastProps) {
	const pill = cn(TOAST, state && toastState({ state }));
	return (
		<View
			accessibilityLiveRegion="polite"
			className={cn(pill, "flex-row items-center self-center shadow-float")}
		>
			{state ? (
				<Glyph
					icon={STATUS_MARK[state]}
					tone={statusContentTone(state)}
					size={16}
				/>
			) : null}
			<RNText className={cn(pill, "shrink px-0 py-0")}>{sentence}</RNText>
			{act ? (
				<Pressable
					accessibilityRole="button"
					onPress={act.onAct}
					className="min-h-11 justify-center"
				>
					<RNText className={cn(pill, "px-0 py-0 font-medium")}>
						{act.label}
					</RNText>
				</Pressable>
			) : null}
		</View>
	);
}

export { toast, useToasts };
