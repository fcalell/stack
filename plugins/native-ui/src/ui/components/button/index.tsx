import {
	BUTTON_MUTED_LABEL,
	type ButtonEmphasis,
	type ButtonSize,
	type ButtonTone,
	button,
	buttonContentTone,
	buttonLabel,
	buttonMuted,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Pressable, type PressableProps, Text } from "react-native";
import { cn } from "../../lib/cn";
import { Spinner } from "../spinner";

// The fill matrix rides the Pressable and the label matrix rides the Text:
// RN Text inherits nothing, so the two tables cannot share a node as on web.
const SHELL = "flex-row items-center justify-center";

// The press grounds are the `active:` half of web's hover/press table — native
// has no hover. The primary/danger cell also needs its label ink swapped while
// pressed: `danger-ink` is the canvas value, near-invisible on `danger-soft`,
// and uniwind's `active:` flag rides the pressed node itself, never the label
// Text, so the swap goes through Pressable's `pressed` render state below.
const GROUND: Record<ButtonEmphasis, Record<ButtonTone, string>> = {
	primary: {
		neutral: "active:bg-ink-3",
		danger: "active:bg-danger-soft",
	},
	secondary: {
		neutral: "active:bg-surface-3",
		danger: "active:bg-danger-soft",
	},
	tertiary: {
		neutral: "active:bg-surface-3",
		danger: "active:bg-danger-soft",
	},
};

export interface ButtonProps extends Omit<PressableProps, "children"> {
	emphasis?: ButtonEmphasis;
	tone?: ButtonTone;
	size?: ButtonSize;
	loading?: boolean;
	children?: ReactNode;
	className?: never;
	style?: never;
}

export function Button({
	emphasis,
	tone,
	size,
	loading,
	children,
	disabled,
	...rest
}: ButtonProps) {
	const resolvedEmphasis = emphasis ?? "primary";
	const resolvedTone = tone ?? "neutral";
	return (
		<Pressable
			accessibilityRole="button"
			disabled={disabled || loading}
			className={cn(
				button({ emphasis: resolvedEmphasis, tone: resolvedTone, size }),
				SHELL,
				disabled
					? buttonMuted({ emphasis: resolvedEmphasis })
					: GROUND[resolvedEmphasis][resolvedTone],
			)}
			{...rest}
		>
			{({ pressed }) => (
				<>
					{/* The glyph is anatomy, not a matrix cell: it spins beside the
					    label in the label's own content tone, read back off the
					    label matrix through ui-core's data path. */}
					{loading ? (
						<Spinner tone={buttonContentTone(resolvedEmphasis, resolvedTone)} />
					) : null}
					{typeof children === "string" ? (
						<Text
							className={cn(
								buttonLabel({
									emphasis: resolvedEmphasis,
									tone: resolvedTone,
									size,
								}),
								disabled && BUTTON_MUTED_LABEL,
								!disabled &&
									pressed &&
									resolvedEmphasis === "primary" &&
									resolvedTone === "danger" &&
									"text-danger",
							)}
						>
							{children}
						</Text>
					) : (
						children
					)}
				</>
			)}
		</Pressable>
	);
}
