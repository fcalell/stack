import type { ProcedureCall } from "@fcalell/plugin-api/types";
import type { LinkAct } from "@fcalell/ui-core/descriptors";
import {
	createContext,
	type ReactNode,
	type RefObject,
	useLayoutEffect,
	useState,
} from "react";
import type { SheetProps } from "../components/sheet/index.tsx";
import type { IconAct } from "./act.ts";

// What the frame molecules hand each other. On touch the Shell hands the act
// that opens its places layer to the Pane, which draws it at the start of a
// bar with no way back; on the desktop there is none.
export const ShellMenu = createContext<IconAct | undefined>(undefined);

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

// The id of the title that names what stands in a Pane or a Gate (the labelling
// a Thread's log and a Table's grid take).
export const PageTitle = createContext<string | undefined>(undefined);

// What a docked foot's region hands the docked `Sheet` it draws, in whole pixels:
// `height` is the region the foot shares with what stands over it (a Thread
// or a footed Pane), `chrome` the foot's own block padding and border and
// the block padding of the body over it,
// and `logFloor` what the region keeps for a log above the foot (zero where
// none shares it). Container units cannot give the height: a size container
// takes no height from its content, so the region would collapse in a column
// of auto height. All zero until measured, where the body is unbounded.
export interface FootRegionValue {
	height: number;
	chrome: number;
	logFloor: number;
}

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

/** The region's measured value and the ref to put on it. `docked` is whether a docked sheet stands in the foot, the one reader of the value: the region is measured only while it does, so a region that grows with its content (a Thread among sections, a message landing) does not commit its owner a second time per update. `dock` is the foot's own node; `logged` is whether a log shares the region with it; `over` is the body standing over the foot, whose block padding never gives way to it. */
export function useFootRegion(
	docked: boolean,
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
	// A sheet that docks is measured in the commit that draws it, before the
	// paint, and the value it was last measured at stands until then.
	useLayoutEffect(() => {
		if (!node || !docked) return;
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
	}, [node, docked, dock, logged, over]);
	return { value, ref };
}

// What a part of a Pane's body hands up for the Pane's foot: the bar it draws
// there (a `Table`'s selection bar, a `Thread`'s composer), and the task that
// docks in its place while it is open (the `Thread`'s `sheet`).
export interface Lifted {
	bar?: ReactNode;
	sheet?: SheetProps<ProcedureCall>;
}

// Where a part of a Pane's body draws in the Pane's foot: the Pane hands it a
// setter, and says whether its body is one filler (`fill`), where a `Thread`
// keeps its own foot. `undefined` outside a Pane.
export interface FootDock {
	lift: (lifted: Lifted | undefined) => void;
	fill: boolean;
}
export const FootBar = createContext<FootDock | undefined>(undefined);
