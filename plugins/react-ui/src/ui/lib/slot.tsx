import { scrambled, tuned } from "@fcalell/ui-core/paint";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { reducedNow } from "./media.ts";
import { Painted } from "./paint.tsx";
import { Decoding } from "./scramble.tsx";
import { Roll } from "./swap.tsx";

/**
 * A figure or id of a read, in both its forms: `Painted` while `painted`, then
 * its `text`. The slot is one instance across the switch, so it knows whether
 * it waited: when the paint stood for `waitDelay` and the theme scrambles its
 * kind, the text decodes as it arrives (otherwise it lands at
 * once), and it rolls when `of`, its number, changes while shown. The layout
 * is the loaded one from the first frame: the decode is paint alone. `text`
 * undefined draws nothing once the read is here.
 */
export function Decoded(props: {
	role: "figure" | "id";
	painted?: boolean;
	at?: number;
	text?: string;
	of?: number;
}) {
	const { role, painted = false, at = 0, text, of } = props;
	const [decoding, setDecoding] = useState(false);
	const since = useRef<number>(undefined);
	// Before paint, so the loaded text never shows ahead of its decode.
	useLayoutEffect(() => {
		if (painted) {
			since.current = performance.now();
			return;
		}
		const waited =
			since.current !== undefined &&
			performance.now() - since.current >= tuned.waitDelay;
		since.current = undefined;
		if (waited && scrambled(role) && !reducedNow()) setDecoding(true);
	}, [painted, role]);
	const done = useCallback(() => setDecoding(false), []);
	if (painted) return <Painted role={role} at={at} />;
	if (text === undefined) return null;
	if (decoding) return <Decoding text={text} onDone={done} />;
	return of === undefined ? text : <Roll text={text} of={of} />;
}
