import { useEffect, useState } from "react";

// What a keyboard reaches by Tab inside a region.
const TABBABLE =
	'a[href], button:not([disabled]), input:not([type="hidden"], [disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Whether a region takes a tab stop of its own: it runs past its box along `axis` and holds nothing a keyboard reaches, so no other stop scrolls it. */
export function takesStop(
	box: {
		scrollWidth: number;
		clientWidth: number;
		scrollHeight: number;
		clientHeight: number;
	},
	axis: "x" | "y",
	tabbable: boolean,
): boolean {
	const scrolls =
		axis === "x"
			? box.scrollWidth > box.clientWidth
			: box.scrollHeight > box.clientHeight;
	return scrolls && !tabbable;
}

/** Whether a scrolling region takes a tab stop (`takesStop`), measured as it resizes. Its children are watched too, since new content resizes them and not the box; a childList change rebinds them. */
export function useScrolls(node: HTMLElement | null, axis: "x" | "y"): boolean {
	const [stop, setStop] = useState(false);
	useEffect(() => {
		if (!node) return;
		const measure = () =>
			setStop(
				takesStop(
					node,
					axis,
					[...node.querySelectorAll(TABBABLE)].some(
						(found) => found.getClientRects().length > 0,
					),
				),
			);
		const resize = new ResizeObserver(measure);
		const watch = () => {
			resize.disconnect();
			resize.observe(node);
			for (const child of node.children) resize.observe(child);
			measure();
		};
		const children = new MutationObserver(watch);
		children.observe(node, { childList: true });
		watch();
		return () => {
			resize.disconnect();
			children.disconnect();
		};
	}, [node, axis]);
	return stop;
}
