import { shortHeld } from "@fcalell/ui-core/list-state";
import { type RefObject, useLayoutEffect, useState } from "react";

/** Whether a status's short form draws: its long form (`word`, a truncating element) is cut on the meta line (`line`). `key` names the words, and none disables it (no short form given). Measured before paint, then as the line resizes; `shortHeld` keeps the two forms from flipping. */
export function useShort(
	line: HTMLElement | null,
	word: RefObject<HTMLElement | null>,
	key: string | undefined,
): boolean {
	const [cut, setCut] = useState<{ key: string; width: number } | null>(null);
	const held = cut !== null && cut.key === key ? cut.width : null;
	useLayoutEffect(() => {
		const text = word.current;
		if (key === undefined || !line || !text) return;
		const measure = () => {
			const next = shortHeld(
				held,
				line.clientWidth,
				() => text.scrollWidth > text.clientWidth,
			);
			if (next !== held) setCut(next === null ? null : { key, width: next });
		};
		measure();
		const resize = new ResizeObserver(measure);
		resize.observe(line);
		return () => resize.disconnect();
	}, [line, word, key, held]);
	return held !== null;
}
