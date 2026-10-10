import { type RefObject, useLayoutEffect, useState } from "react";

/** Whether a meta line's later parts are dropped whole: the room the line leaves them (its width less the first part, the marks and the gaps between) is under the `figures` they show at least, so their slot wraps them away. Read off the geometry, which the slot does not move, so the answer never rests on the form drawn. `marks` is how many items follow the parts on the line; none disables it (nothing stands off the first part). `key` names the marks' words, which resize them. */
export function useDropped(
	line: HTMLElement | null,
	first: RefObject<HTMLElement | null>,
	text: RefObject<HTMLElement | null>,
	marks: number,
	key: string,
): boolean {
	const [dropped, drop] = useState(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` only re-observes the marks when their words change
	useLayoutEffect(() => {
		const lead = first.current;
		const later = text.current;
		if (!line || !lead || !later || marks === 0) {
			drop(false);
			return;
		}
		const items = [...line.children].slice(1);
		const measure = () => {
			const gap = Number.parseFloat(getComputedStyle(line).columnGap) || 0;
			const figures = Number.parseFloat(getComputedStyle(later).flexBasis);
			let room = line.clientWidth - lead.getBoundingClientRect().width;
			for (const item of items)
				room -= item.getBoundingClientRect().width + gap;
			drop(room < (Number.isNaN(figures) ? 0 : figures) + 1 / 32);
		};
		measure();
		const resize = new ResizeObserver(measure);
		resize.observe(line);
		resize.observe(lead);
		for (const item of items) resize.observe(item);
		return () => resize.disconnect();
	}, [line, first, text, marks, key]);
	return dropped;
}
