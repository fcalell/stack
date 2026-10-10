import { useCallback, useState } from "react";

/** Whether a title's text runs on more than one line: its box without the block padding is taller than one and a half line boxes. */
export function wraps(box: {
	height: number;
	padding: number;
	line: number;
}): boolean {
	return box.height - box.padding > box.line * 1.5;
}

/** A title's ref, and whether its text wraps, re-measured as it resizes. */
export function useWraps(): [(node: HTMLElement | null) => void, boolean] {
	const [wrapped, setWrapped] = useState(false);
	const ref = useCallback((node: HTMLElement | null) => {
		if (!node) return;
		const measure = () => {
			const style = getComputedStyle(node);
			setWrapped(
				wraps({
					height: node.getBoundingClientRect().height,
					padding:
						Number.parseFloat(style.paddingTop) +
						Number.parseFloat(style.paddingBottom),
					line: Number.parseFloat(style.lineHeight),
				}),
			);
		};
		const resize = new ResizeObserver(measure);
		resize.observe(node);
		measure();
		return () => resize.disconnect();
	}, []);
	return [ref, wrapped];
}
