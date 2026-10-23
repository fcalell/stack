import {
	OVERSCAN,
	ranged,
	slotsOf,
	VIRTUAL_FROM,
} from "@fcalell/ui-core/window";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
	createContext,
	type Key,
	type ReactElement,
	type ReactNode,
	type RefObject,
	use,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";

/** The nearest element that scrolls vertically, which a long collection windows against; none draws every row. A Pane's body, a Sheet's body, a Gate's page, a Thread's log, a sheet's listbox of options, a popover's list of options and a long BarChart's plot (which scrolls sideways) provide it, the nearest one winning, so a Section's sheet in a portaled Sheet never windows against the Pane under it. The `holder` is the same from the first render, its element attached with the commit, so a collection mounting with the Pane windows in its first draw; `node` is the element as state, so what measures against it renders once it has arrived. */
export const Scroller = createContext<{
	holder: RefObject<HTMLElement | null>;
	node: HTMLElement | null;
} | null>(null);

/** A scrolling body's `Scroller` value (its `holder` and `node`) and the ref that fills it (and `own`, the host's ref to the same element). The ref is one function for the body's life, so a render never detaches the holder from under a Window that measures in the same commit; the value changes only as the element does. */
export function useScroller<T extends HTMLElement = HTMLElement>(
	own?: RefObject<T | null>,
) {
	const holder = useRef<HTMLElement | null>(null);
	const [node, setNode] = useState<HTMLElement | null>(null);
	const ref = useCallback(
		(element: T | null) => {
			holder.current = element;
			if (own) own.current = element;
			setNode(element);
		},
		[own],
	);
	return useMemo(() => ({ holder, node, ref }), [node, ref]);
}

// The height a row is taken to have until the first one is measured.
const ESTIMATE = 48;
// A spacer (`data-spacer`, `aria-hidden`) is out of the accessibility tree
// and stands for rows outside the window: room by design and no dead box.
// How long a scroll is taken to run after its last event (ms).
const SETTLED = 150;

export interface WindowProps {
	/** How many rows there are. */
	count: number;
	/** The key of the row at an index, which the virtualizer keeps its measures by. */
	keyOf: (index: number) => Key;
	/** The row at an index, exactly one element carrying that key: built only for the indices the window mounts, so a long collection never builds (or renders) the rest. */
	row: (index: number) => ReactElement;
	/** The element the rows stand in as its first children, each row exactly one element. */
	box: RefObject<HTMLElement | null>;
	/** A row mounted whatever the scroll (a Table's cursor). */
	keep?: number;
	/** The window opens at the last rows (a Thread). */
	end?: boolean;
	/** The element a spacer is: a `tr` in a tbody. */
	spacer?: "div" | "tr";
	/** The rows stand side by side in a box that scrolls sideways (a chart's bars), so the window runs along x: widths for heights, the scroller's left for its top. */
	horizontal?: boolean;
}

// The scroller's top over the box's top (its left, along x): how far the
// scroller's view has gone into the box, so a collection's place in the page
// is nobody's business.
function into(
	scroller: HTMLElement,
	box: HTMLElement | null,
	horizontal: boolean,
): number {
	if (!box) return 0;
	const [view, at] = [scroller, box].map((element) =>
		element.getBoundingClientRect(),
	) as [DOMRect, DOMRect];
	return horizontal
		? view.left + scroller.clientLeft - at.left
		: view.top + scroller.clientTop - at.top;
}

// The box's gap between rows, which every spacer gives back to its neighbours.
function gapOf(box: HTMLElement, horizontal: boolean): number {
	const style = getComputedStyle(box);
	return Number.parseFloat(horizontal ? style.columnGap : style.rowGap) || 0;
}

/** The rows of a long collection, drawn only near the scroller's view: TanStack Virtual places and ranges them, the mounted rows stand in the host's box between spacers that hold the room of the rest. Fewer than `VIRTUAL_FROM` rows, or no `Scroller`, draw every row unchanged, so crossing the count (a Show more) mounts nothing again. The rows are measured by their place among the box's children, so a row is exactly one element and carries nothing of this. The focused row and `keep` stay mounted. */
export function Window({
	count,
	keyOf,
	row,
	box,
	keep,
	end,
	spacer = "div",
	horizontal = false,
}: WindowProps): ReactNode {
	const scroll = use(Scroller);
	// A Window mounting with its scroller (a Pane's first render) renders
	// before the element is attached, from the viewport's size; the element
	// arriving (`node`) renders it once more, to measure against it.
	const scroller = scroll?.node ?? null;
	const on = scroll !== null && count >= VIRTUAL_FROM;
	const view = {
		width: scroller?.clientWidth ?? window.innerWidth,
		height: scroller?.clientHeight ?? window.innerHeight,
	};
	// The row holding focus, which the extractor reads at its moment, not at a
	// render.
	const focused = useRef<number>(undefined);
	// The box's gap and a row's height, read when the window opens. They are
	// state so the virtualizer holds them before it measures again.
	const [shape, setShape] = useState<{ gap: number; size: number }>();
	const { gap, size } = shape ?? { gap: 0, size: ESTIMATE };
	// How much of the virtualizer's adjustments since its last offset the
	// scroller has already taken.
	const applied = useRef(0);
	// Reports the scroller's offset when the virtualizer holds another one.
	const sync = useRef<() => void>(undefined);
	// Whether the scroller's offset has been reported to the virtualizer since it
	// took the scroller.
	const heard = useRef(false);
	// A mounted row's size along the window's axis.
	const extentOf = (node: Element | undefined) => {
		const rect = node?.getBoundingClientRect();
		return (horizontal ? rect?.width : rect?.height) ?? 0;
	};
	const extract = useCallback(
		(range: Parameters<typeof ranged>[0]) =>
			ranged(range, [focused.current, keep]),
		// A new `keep` is a new extractor, which ranges again.
		[keep],
	);
	const virtualizer = useVirtualizer<HTMLElement, Element>({
		count,
		horizontal,
		enabled: on,
		getScrollElement: () => scroll?.holder.current ?? null,
		estimateSize: () => size,
		getItemKey: keyOf,
		gap,
		overscan: OVERSCAN,
		rangeExtractor: extract,
		useFlushSync: false,
		initialRect: view,
		initialOffset: () =>
			end
				? Math.max(0, count * size - (horizontal ? view.width : view.height))
				: 0,
		observeElementOffset: (instance, report) => {
			const element = instance.scrollElement;
			if (!element) return;
			let running = false;
			let timer: ReturnType<typeof setTimeout> | undefined;
			heard.current = false;
			const send = () => {
				heard.current = true;
				applied.current = 0;
				report(into(element, box.current, horizontal), running);
			};
			const onScroll = () => {
				running = true;
				send();
				clearTimeout(timer);
				timer = setTimeout(() => {
					running = false;
					send();
				}, SETTLED);
			};
			element.addEventListener("scroll", onScroll, { passive: true });
			sync.current = () => {
				if (into(element, box.current, horizontal) !== instance.scrollOffset) {
					send();
				}
			};
			// Content above the box changing height moves the box without a
			// scroll; the observer also reports once on observing, which gives
			// the first true offset once the box stands.
			const resize = new ResizeObserver(send);
			resize.observe(element);
			for (const child of element.children) resize.observe(child);
			return () => {
				sync.current = undefined;
				element.removeEventListener("scroll", onScroll);
				clearTimeout(timer);
				resize.disconnect();
			};
		},
		scrollToFn: (offset, { adjustments, behavior }, instance) => {
			const element = instance.scrollElement;
			if (!element) return;
			// The virtualizer's first move on a scroller is its initial offset,
			// which is box-relative: honoured, it would scroll the box's top to the
			// view's top, past whatever stands above it (a toolbar) and over a scroll
			// the scroller already held. A window opens where the page stands (a
			// Thread's, at its end), so it hears where that is.
			if (!heard.current && adjustments === undefined && !end) {
				sync.current?.();
				return;
			}
			// The virtualizer speaks box-relative, the scroller its own. An
			// adjustment (rows above the view measured) moves the scroller from
			// where it is now, not from the offset the virtualizer last heard: a
			// scroll the browser made since (a focus) is not undone.
			const now = horizontal ? element.scrollLeft : element.scrollTop;
			const to =
				adjustments === undefined
					? now - into(element, box.current, horizontal) + offset
					: now + adjustments - applied.current;
			applied.current = adjustments ?? 0;
			element.scrollTo(
				horizontal ? { left: to, behavior } : { top: to, behavior },
			);
		},
	});
	const placed = on
		? virtualizer.getVirtualItems().map(({ index, start, end: stop }) => ({
				index,
				start,
				end: stop,
			}))
		: [];
	const slots = on
		? slotsOf(placed, count, virtualizer.getTotalSize(), gap)
		: [];
	// What the box holds after this commit, which the effects measure it by.
	const drawn = useRef(slots);
	useLayoutEffect(() => {
		drawn.current = slots;
	});

	// A scroll the host made in the same commit (Latest) is heard as the scroll
	// event arrives, a frame later; the window renders against the offset the
	// scroller has now, so the rows it jumped to are mounted when it lands.
	useLayoutEffect(() => sync.current?.());

	// The first row's height stands in for the rest of the rows, which nothing
	// has measured yet, so the virtualizer starts over once it holds the shape.
	useLayoutEffect(() => {
		if (shape) virtualizer.measure();
	}, [shape, virtualizer]);

	// Measure what is mounted, and keep measuring it.
	const watch = useRef<ResizeObserver | null>(null);
	const indexed = useRef(new Map<Element, number>());
	useEffect(() => {
		const element = box.current;
		if (!on || !element) {
			setShape(undefined);
			return;
		}
		const found = drawn.current;
		const mounted = [...element.children].slice(0, found.length);
		if (process.env.NODE_ENV !== "production") check(found, mounted);
		const first = found.findIndex((slot) => "row" in slot);
		if (!shape && first >= 0) {
			setShape({
				gap: gapOf(element, horizontal),
				size: extentOf(mounted[first]) || ESTIMATE,
			});
			return;
		}
		const rowsAt = new Map<Element, number>();
		found.forEach((slot, at) => {
			const node = mounted[at];
			if (!node || !("row" in slot)) return;
			rowsAt.set(node, slot.row);
			virtualizer.resizeItem(slot.row, extentOf(node));
		});
		indexed.current = rowsAt;
		watch.current ??= new ResizeObserver((entries) => {
			for (const entry of entries) {
				const index = indexed.current.get(entry.target);
				// A row just unmounted is reported once more, at no height.
				if (index !== undefined && entry.target.isConnected) {
					virtualizer.resizeItem(index, extentOf(entry.target));
				}
			}
		});
		watch.current.disconnect();
		for (const node of rowsAt.keys()) watch.current.observe(node);
	});
	useEffect(() => () => watch.current?.disconnect(), []);

	// The row holding focus stays mounted: tracked on the box, read by the
	// extractor at the next range.
	useEffect(() => {
		const element = box.current;
		if (!on || !element) return;
		const focus = (event: FocusEvent) => {
			const at = [...element.children].findIndex((node) =>
				node.contains(event.target as Node),
			);
			const slot = drawn.current[at];
			focused.current = slot && "row" in slot ? slot.row : undefined;
		};
		const blur = (event: FocusEvent) => {
			if (!element.contains(event.relatedTarget as Node | null)) {
				focused.current = undefined;
			}
		};
		element.addEventListener("focusin", focus);
		element.addEventListener("focusout", blur);
		// A box that windows does not let the browser anchor inside it: the
		// virtualizer's own adjustment is the only one.
		element.style.overflowAnchor = "none";
		return () => {
			element.removeEventListener("focusin", focus);
			element.removeEventListener("focusout", blur);
			element.style.overflowAnchor = "";
		};
	}, [on, box]);

	if (!on) return Array.from({ length: count }, (_, index) => row(index));
	const Space = spacer;
	return slots.map((slot) => {
		if ("row" in slot) return row(slot.row);
		const style = horizontal ? { width: slot.space } : { height: slot.space };
		return Space === "tr" ? (
			<tr key={`window-${slot.before}`} aria-hidden data-spacer>
				<td style={{ ...style, padding: 0, border: 0 }} />
			</tr>
		) : (
			<div
				key={`window-${slot.before}`}
				aria-hidden
				data-spacer
				style={style}
				className="shrink-0"
			/>
		);
	});
}

// A row that is not exactly one element of the box shifts every child after
// it off its slot, so the spacers are where it shows.
function check(
	slots: ReturnType<typeof slotsOf>,
	mounted: readonly Element[],
): void {
	slots.forEach((slot, at) => {
		const space = mounted[at]?.getAttribute("aria-hidden") === "true";
		if (mounted[at] === undefined || space !== !("row" in slot)) {
			throw new Error(
				"Window: each row must be exactly one element, the first children of the box",
			);
		}
	});
}
