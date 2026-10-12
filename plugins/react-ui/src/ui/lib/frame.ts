import type { LinkAct, Switcher } from "@fcalell/ui-core/descriptors";
import {
	createContext,
	type RefObject,
	useLayoutEffect,
	useState,
} from "react";

// What the frame molecules hand each other. The Shell hands its switcher to
// the Pane, which draws its trigger at the start of its touch bar.
export const ShellSwitcher = createContext<Switcher | undefined>(undefined);

// The way to the first of the Shell's places that is an address of the app:
// where the page for an address nothing serves leads. `undefined` outside a
// Shell, which is how that page knows whether it stands in one.
export const ShellHome = createContext<LinkAct | undefined>(undefined);

// The route of the Shell's current place, where a read with no Pane's
// `back` around it leads back.
export const PlaceRoute = createContext<string | undefined>(undefined);

// The route a Pane's back act returns to, where a read inside that answers
// not found leads back; with none a read leads to `PlaceRoute`.
export const BackRoute = createContext<string | undefined>(undefined);

// The id of the Pane's title, which names what stands in it.
export const PageTitle = createContext<string | undefined>(undefined);

// Where the foot a `Sheet` stands in is: `docked` in a Thread's or a Pane's
// foot, `null` anywhere else. A
// `Sheet` in a foot draws its docked form, which resets it to `null` for what
// it holds, so a sheet opened from inside is the modal one.
export const FootPlace = createContext<"docked" | null>(null);

// What a docked foot's region hands the docked `Sheet` in it, in whole pixels:
// `height` is the region the foot shares with what stands over it (a Thread
// or a footed Pane), `chrome` the foot's own block padding and border and
// the block padding of the body over it,
// and `logFloor` what the region keeps for a log above the foot (zero where
// none shares it). Container units cannot give the height: a size container
// takes no height from its content, so the region would collapse in a column
// of auto height. All zero until measured and outside a docked region, where
// the body is unbounded.
export interface FootRegionValue {
	height: number;
	chrome: number;
	logFloor: number;
}
export const FootRegion = createContext<FootRegionValue>({
	height: 0,
	chrome: 0,
	logFloor: 0,
});

const BLOCK_SIDES = [
	"paddingTop",
	"paddingBottom",
	"borderTopWidth",
	"borderBottomWidth",
] as const;

function sides(style: CSSStyleDeclaration): number {
	return BLOCK_SIDES.reduce(
		(sum, side) => sum + Number.parseFloat(style[side]),
		0,
	);
}

// The block padding of the body over the foot: the foot is bounded by the
// region less it, so the body's insets stand even where the foot takes the
// rest.
function overPadding(node: HTMLElement | null | undefined): number {
	if (!node) return 0;
	const style = getComputedStyle(node);
	return (
		Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom)
	);
}

/** The region's measured value and the ref to put on it. `dock` is the foot's own node; `logged` is whether a log shares the region with it; `over` is the body standing over the foot, whose block padding never gives way to it. */
export function useFootRegion(
	dock: RefObject<HTMLElement | null>,
	logged: boolean,
	over?: RefObject<HTMLElement | null>,
) {
	const [node, ref] = useState<HTMLElement | null>(null);
	const [value, setValue] = useState<FootRegionValue>({
		height: 0,
		chrome: 0,
		logFloor: 0,
	});
	useLayoutEffect(() => {
		if (!node) return;
		const measure = () => {
			const style = dock.current ? getComputedStyle(dock.current) : null;
			const next = {
				height: Math.round(node.getBoundingClientRect().height),
				chrome: (style ? sides(style) : 0) + overPadding(over?.current),
				logFloor:
					logged && style
						? Number.parseFloat(
								style.getPropertyValue("--spacing-docked-log-floor"),
							)
						: 0,
			};
			setValue((last) =>
				last.height === next.height &&
				last.chrome === next.chrome &&
				last.logFloor === next.logFloor
					? last
					: next,
			);
		};
		measure();
		const resize = new ResizeObserver(measure);
		resize.observe(node);
		return () => resize.disconnect();
	}, [node, dock, logged, over]);
	return { value, ref };
}
