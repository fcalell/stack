import {
	BUTTON_MUTED,
	BUTTON_MUTED_LABEL,
	type ButtonAct,
	button,
	buttonContentTone,
	buttonLabel,
	text,
} from "@fcalell/ui-core/variants";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	Text as RNText,
	View,
} from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useTokenColor } from "../../lib/theme";
import { useTouched } from "../../lib/touched";

export interface ButtonProps extends Closed {
	act?: ButtonAct;
	label: string;
	onAct?: () => void;
	loading?: boolean;
	blocked?: string;
}

// The press ground moves the fill, never the alpha, so the label keeps its
// contrast: the primary steps down the ink ladder, the others onto the edge.
const GROUND: Record<ButtonAct, string> = {
	primary: "active:bg-ink-meta",
	secondary: "active:bg-edge",
	destructive: "active:bg-edge",
};

// A pill with words. Its container decides its width: full in an action bar,
// its content's in a toolbar. A blocked button says why under it once
// pressed or once its form or sheet is touched.
export function Button({ act, label, onAct, loading, blocked }: ButtonProps) {
	const kind = act ?? "primary";
	const muted = blocked !== undefined;
	const { touched } = useTouched();
	const [pressed, setPressed] = useState(false);
	useEffect(() => {
		if (!muted) setPressed(false);
	}, [muted]);
	const said = muted && (pressed || touched);
	const spinner = useTokenColor(`--color-${buttonContentTone(kind)}`);
	return (
		<View className="gap-pair">
			<Pressable
				accessibilityRole="button"
				accessibilityState={{ disabled: muted || loading, busy: loading }}
				accessibilityHint={said ? blocked : undefined}
				disabled={loading}
				onPress={() => (muted ? setPressed(true) : onAct?.())}
				className={cn(
					button({ act: kind }),
					"flex-row items-center justify-center",
					muted ? BUTTON_MUTED : GROUND[kind],
				)}
			>
				{loading ? <ActivityIndicator color={spinner} /> : null}
				<RNText
					className={cn(
						buttonLabel({ act: kind }),
						muted && BUTTON_MUTED_LABEL,
					)}
				>
					{label}
				</RNText>
			</Pressable>
			{said ? (
				<RNText className={cn(text({ role: "meta" }), "text-center")}>
					{blocked}
				</RNText>
			) : null}
		</View>
	);
}
