import type { Dialog } from "@base-ui/react/dialog";
import type { LinkAct, Switcher } from "@fcalell/ui-core/descriptors";
import {
	createContext,
	type ReactNode,
	type RefObject,
	useLayoutEffect,
	useState,
} from "react";

// What the frame molecules hand each other. The Shell hands its switcher to
// the Place, which draws its trigger at the start of its touch top bar.
export const ShellSwitcher = createContext<Switcher | undefined>(undefined);

// The handle of the details sheet a Split's pane opens in, owned by the Place
// or pushed Screen it sits in, which draws the sheet's trigger, the Details
// act, from its first frame. The Split marks its root (`data-record` while a
// record is open, `data-pane` while that record has a pane, `data-beside` while
// a record stands beside the main) and the page's head shows its acts by the
// marks: the Details act below `wide` of the page with a pane, at every width
// beside a record; the back act to the list below `tablet` with a record;
// below `tablet` with a record beside the main, no head at all.
export const DetailsSheet = createContext<Dialog.Handle<unknown> | null>(null);

// A Split's `beside` record is a Screen standing in its page, not a page of
// its own: it covers no tab bar, its title is a heading at the level where it
// stands, its body is the size container what stands in it decides by, and
// its back act draws as Close to the same route from `wide` of the page.
// Below `tablet` of the page its head stands alone, so it draws the Details
// act of the Split's pane while it is open; `null` outside a `beside`.
export interface BesideFrame {
	details?: Dialog.Handle<unknown>;
}
export const Beside = createContext<BesideFrame | null>(null);

// The way to the first of the Shell's places that is an address of the app:
// where the page for an address nothing serves leads. `undefined` outside a
// Shell, which is how that page knows whether it stands in one.
export const ShellHome = createContext<LinkAct | undefined>(undefined);

// The route of the Shell's current place: the list a Place returns to
// from a record its Split shows alone.
export const PlaceRoute = createContext<string | undefined>(undefined);

// The route a Screen's back act returns to, where a read inside that answers
// not found leads back; a Split inside hands its `back` in its stead; with none
// a read leads to `PlaceRoute`.
export const BackRoute = createContext<string | undefined>(undefined);

// Whether a Thread, or a source TextArea in a page Form, standing here fills
// the region it stands in: true in a Place's body without a foot and in a
// Split's main, false in a Section, where it stands among the page's sections.
// A filling Thread marks its root `data-fill`, and the region reads the mark
// by a `has-[>[data-fill]]` variant (no inset, scrolling left to the log) from
// its first frame. A filling TextArea marks its box, which the Form and the
// FormField around it read by `has-data-fill` to grow.
export const ThreadRoom = createContext(false);

// A Split's main keeps the page inset around the record's head, so a Thread
// filling it bleeds through the sides, its log and foot inset themselves.
export const ThreadBleeds = createContext(false);

// A Split's main, whose record head stands in the Thread's column on the
// desktop while a Thread fills the main (the main's `data-fill` mark).
export const OverThread = createContext(false);

// A bleeding touch Place hands the room its floating act needs to the regions
// that scroll inside its body, which keep it under their last row.
export const ActRoom = createContext<ReactNode>(null);

// The id of the Place's or Screen's title, which names a Split's list.
export const PageTitle = createContext<string | undefined>(undefined);

// Where the foot a `Sheet` stands in is: `docked` in a filling Thread's or a
// Place's foot, `inline` in a Thread among sections, `null` anywhere else. A
// `Sheet` in a foot draws its docked form, which resets it to `null` for what
// it holds, so a sheet opened from inside is the modal one.
export const FootPlace = createContext<"docked" | "inline" | null>(null);

// What a docked foot's region hands the docked `Sheet` in it, in whole pixels:
// `height` is the region the foot shares with what stands over it (a filling
// Thread or a footed Place), `chrome` the foot's own block padding and border,
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

/** The region's measured value and the ref to put on it. `dock` is the foot's own node; `logged` is whether a log shares the region with it. */
export function useFootRegion(
	dock: RefObject<HTMLElement | null>,
	logged: boolean,
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
				chrome: style
					? BLOCK_SIDES.reduce(
							(sum, side) => sum + Number.parseFloat(style[side]),
							0,
						)
					: 0,
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
	}, [node, dock, logged]);
	return { value, ref };
}
