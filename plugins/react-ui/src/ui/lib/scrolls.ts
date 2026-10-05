import { useEffect, useState } from "react";
import { isTabbable } from "./focus.ts";

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

/** Whether a mutation changed `node`'s own children, the ones its size is watched on; a change deeper in the subtree only needs a re-measure. */
export function changesChildren(
	records: ReadonlyArray<{ type: string; target: unknown }>,
	node: unknown,
): boolean {
	return records.some(
		(record) => record.type === "childList" && record.target === node,
	);
}

// The attributes that make an element reachable by Tab, or not (`isTabbable`).
const TABBABLE_ATTRIBUTES = [
	"tabindex",
	"disabled",
	"hidden",
	"inert",
	"aria-hidden",
	"href",
	"contenteditable",
];

/** Whether a scrolling region takes a tab stop (`takesStop`), measured as it resizes. Its children are watched too, since new content resizes them and not the box; a change to its own children rebinds them. Content swapping anywhere inside it, or an element becoming or ceasing to be tabbable, re-measures it, since a loaded body holds its waiting size and resizes nothing. */
export function useScrolls(node: HTMLElement | null, axis: "x" | "y"): boolean {
	const [stop, setStop] = useState(false);
	useEffect(() => {
		if (!node) return;
		const measure = () =>
			setStop(
				takesStop(
					node,
					axis,
					Array.from(node.querySelectorAll<HTMLElement>("*")).some(isTabbable),
				),
			);
		const resize = new ResizeObserver(measure);
		const watch = () => {
			resize.disconnect();
			resize.observe(node);
			for (const child of node.children) resize.observe(child);
			measure();
		};
		const content = new MutationObserver((records) => {
			if (changesChildren(records, node)) watch();
			else measure();
		});
		content.observe(node, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: TABBABLE_ATTRIBUTES,
		});
		watch();
		return () => {
			resize.disconnect();
			content.disconnect();
		};
	}, [node, axis]);
	return stop;
}
