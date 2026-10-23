import { scrambled, tuned } from "@fcalell/ui-core/paint";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Text as RNText, type TextProps } from "react-native";
import { reducedNow } from "./motion";
import { clipWhen, Painted, PaintText } from "./paint";
import { Decoding } from "./scramble";
import { Roll } from "./swap";

// A figure or id of a read, in both its forms: its filler in a `PaintText`
// while `painted`, then its `text`. The slot is one instance across the
// switch, so it knows whether it waited: when the paint stood for `waitDelay`
// and the theme scrambles its kind, the text decodes as it arrives (otherwise
// it lands at once), and it rolls when `of`, its number,
// changes while shown. The layout is the loaded one from the first frame: the
// decode is paint alone. `className`, `style` and `numberOfLines` are its
// text's; `text` undefined draws an empty text once the read is here.
export function Decoded(props: {
	role: "figure" | "id";
	painted?: boolean;
	at?: number;
	text?: string;
	of?: number;
	className?: string;
	style?: TextProps["style"];
	numberOfLines?: number;
}) {
	const { role, painted = false, at = 0, text, of } = props;
	const { className, style, numberOfLines } = props;
	const [decoding, setDecoding] = useState(false);
	const since = useRef<number>(undefined);
	// Before paint, so the loaded text never shows ahead of its decode.
	useLayoutEffect(() => {
		if (painted) {
			since.current = Date.now();
			return;
		}
		const waited =
			since.current !== undefined &&
			Date.now() - since.current >= tuned.waitDelay;
		since.current = undefined;
		if (waited && scrambled(role) && !reducedNow()) setDecoding(true);
	}, [painted, role]);
	const done = useCallback(() => setDecoding(false), []);
	if (painted)
		return (
			<PaintText
				painted
				fills={role}
				numberOfLines={numberOfLines}
				{...clipWhen(true)}
				className={className}
				style={style}
			>
				<Painted role={role} at={at} />
			</PaintText>
		);
	if (text === undefined)
		return (
			<RNText
				className={className}
				style={style}
				numberOfLines={numberOfLines}
			/>
		);
	if (decoding)
		return (
			<Decoding
				text={text}
				onDone={done}
				className={className}
				style={style}
				numberOfLines={numberOfLines}
			/>
		);
	if (of === undefined)
		return (
			<RNText className={className} style={style} numberOfLines={numberOfLines}>
				{text}
			</RNText>
		);
	return <Roll text={text} of={of} className={className} style={style} />;
}
