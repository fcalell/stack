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
	useReducer,
	useRef,
	useState,
} from "react";

/** The holder of the nearest element that scrolls vertically, which a long collection windows against; none draws every row. A Pane's body, a Sheet's body, a Gate's page and a Thread's log provide it, the nearest one winning, so a List in a portaled Sheet never windows against the Pane under it. The holder is the same from the first render, its element attached with the commit, so a collection mounting with the Pane windows in its first draw. */
export const Scroller = createContext<RefObject<HTMLElement | null> | null>(
	null,
);

/** A scrolling body's `Scroller` value and the ref that fills it (and `own`, the host's ref to the same element): `node` is state, for what reacts to the element arriving. The ref is one function for the body's life, so a render never detaches the holder from under a Window that measures in the same commit. */
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
	return { holder, node, ref };
}

// The height a row is taken to have until the first one is measured.
const ESTIMATE = 48;
// A spacer is out of the accessibility tree and is what `check` knows it by.
const HIDDEN = { "aria-hidden": true } as const;
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
}

// The scroller's top over the box's top: how far the scroller's view has gone
// into the box, so a collection's place in the page is nobody's business.
function into(scroller: HTMLElement, box: HTMLElement | null): number {
	if (!box) return 0;
	return (
		scroller.getBoundingClientRect().top +
		scroller.clientTop -
		box.getBoundingClientRect().top
	);
}

// The box's row gap, which every spacer gives back to its neighbours.
function gapOf(box: HTMLElement): number {
	return Number.parseFloat(getComputedStyle(box).rowGap) || 0;
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
}: WindowProps): ReactNode {
	const holder = use(Scroller);
	const scroller = holder?.current ?? null;
	const on = holder !== null && count >= VIRTUAL_FROM;
	// A Window mounting with its scroller (a Pane's first render) renders
	// before the element is attached, from the viewport's size; it renders once
	// more when the element has arrived, to measure against it.
	const [, arrive] = useReducer((count: number) => count + 1, 0);
	useEffect(() => {
		if (holder && holder.current !== scroller) arrive();
	});
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
	const extract = useCallback(
		(range: Parameters<typeof ranged>[0]) =>
			ranged(range, [focused.current, keep]),
		// A new `keep` is a new extractor, which ranges again.
		[keep],
	);
	const virtualizer = useVirtualizer<HTMLElement, Element>({
		count,
		enabled: on,
		getScrollElement: () => holder?.current ?? null,
		estimateSize: () => size,
		getItemKey: keyOf,
		gap,
		overscan: OVERSCAN,
		rangeExtractor: extract,
		useFlushSync: false,
		initialRect: view,
		initialOffset: () => (end ? Math.max(0, count * size - view.height) : 0),
		observeElementOffset: (instance, report) => {
			const element = instance.scrollElement;
			if (!element) return;
			let running = false;
			let timer: ReturnType<typeof setTimeout> | undefined;
			const send = () => {
				applied.current = 0;
				report(into(element, box.current), running);
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
				if (into(element, box.current) !== instance.scrollOffset) send();
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
			// The virtualizer speaks box-relative, the scroller its own. An
			// adjustment (rows above the view measured) moves the scroller from
			// where it is now, not from the offset the virtualizer last heard: a
			// scroll the browser made since (a focus) is not undone.
			const top =
				adjustments === undefined
					? element.scrollTop - into(element, box.current) + offset
					: element.scrollTop + adjustments - applied.current;
			applied.current = adjustments ?? 0;
			element.scrollTo({ top, behavior });
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
				gap: gapOf(element),
				size: mounted[first]?.getBoundingClientRect().height || ESTIMATE,
			});
			return;
		}
		const rowsAt = new Map<Element, number>();
		found.forEach((slot, at) => {
			const node = mounted[at];
			if (!node || !("row" in slot)) return;
			rowsAt.set(node, slot.row);
			virtualizer.resizeItem(slot.row, node.getBoundingClientRect().height);
		});
		indexed.current = rowsAt;
		watch.current ??= new ResizeObserver((entries) => {
			for (const entry of entries) {
				const index = indexed.current.get(entry.target);
				// A row just unmounted is reported once more, at no height.
				if (index !== undefined && entry.target.isConnected) {
					virtualizer.resizeItem(
						index,
						entry.target.getBoundingClientRect().height,
					);
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
		const style = { height: slot.space };
		return Space === "tr" ? (
			<tr key={`window-${slot.before}`} {...HIDDEN}>
				<td style={{ ...style, padding: 0, border: 0 }} />
			</tr>
		) : (
			<div
				key={`window-${slot.before}`}
				{...HIDDEN}
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
