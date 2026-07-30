import {
	type TextTone,
	type TextVariant,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { cn } from "../../lib/cn";

export interface TextProps extends RNTextProps {
	variant?: TextVariant;
	tone?: TextTone;
	strong?: boolean;
	mono?: boolean;
}

export function Text({
	variant,
	tone,
	strong,
	mono,
	className,
	...rest
}: TextProps) {
	const role = variant ?? "body";
	return (
		<RNText
			className={cn(
				// Web inherits `ink-1` from its base layer; RN Text inherits nothing,
				// so the default tone is explicit here.
				text({ variant: role, tone: tone ?? "ink-1" }),
				strong && textStrong({ variant: role }),
				// Font family is a platform overlay, so it never enters the matrix.
				// Without a registered mono font this degrades to the system face.
				mono && "font-mono",
				className,
			)}
			{...rest}
		/>
	);
}
