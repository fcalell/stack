import type { Dialog } from "@base-ui/react/dialog";
import { createContext, type ReactNode, use, useCallback } from "react";

// What the frame molecules hand each other. The Shell hands its switcher's
// trigger to the Place, which starts its touch top bar with it.
export const ShellSwitcher = createContext<ReactNode>(null);

// A pushed Screen covers the touch Shell's tab bar while it is mounted.
export const CoverTabs = createContext<((covered: boolean) => void) | null>(
	null,
);

// A Place whose act floats on touch tells the Shell, whose toasts then stand
// above the act by its room.
export const ActFloats = createContext<((floats: boolean) => void) | null>(
	null,
);

// A docked foot (a Place's `foot`, a filling Thread's input) tells the Shell
// its height, whose toasts then stand above the foot; 0 takes it back.
export const FootDocks = createContext<((height: number) => void) | null>(null);

// The ref of a docked foot: it reports the foot's height to `FootDocks` as
// the foot grows, and takes it back when the foot leaves.
export function useFootDocks() {
	const docks = use(FootDocks);
	return useCallback(
		(foot: HTMLDivElement) => {
			if (!docks) return;
			const observer = new ResizeObserver(() => docks(foot.offsetHeight));
			observer.observe(foot);
			return () => {
				observer.disconnect();
				docks(0);
			};
		},
		[docks],
	);
}

// A Split with a record and its pane open lends its details sheet's handle to
// the Place or Screen it sits in, which draws the sheet's trigger, the Details
// act, after its own actions below `wide` of its width, and at every width
// while a record stands `beside` the main; `undefined` takes it back.
export interface LentDetails {
	sheet: Dialog.Handle<unknown>;
	beside: boolean;
}
export const LendAct = createContext<
	((details: LentDetails | undefined) => void) | null
>(null);

// A Split's `beside` record is a Screen standing in its page, not a page of
// its own: it covers no tab bar, its title is a heading at the level where it
// stands, its body is the size container what stands in it decides by, and
// its back act draws as Close to the same route from `wide` of the page.
// Below `tablet` of the page its head stands alone, so it draws the Details
// act the Split lends while its pane is open; `null` outside a `beside`.
export interface BesideFrame {
	details?: LentDetails;
}
export const Beside = createContext<BesideFrame | null>(null);

// A Split tells the Place it sits in that a record stands beside the main;
// below `tablet` of its width, where that record stands alone, the Place then
// draws no head, the record's own head the page's one, and `false` takes it
// back.
export const BesideOpen = createContext<((open: boolean) => void) | null>(null);

// The route of the Shell's current place: the list a Place returns to
// from a record its Split shows alone.
export const PlaceRoute = createContext<string | undefined>(undefined);

// The route a Screen's back act returns to, where a read inside that answers
// not found leads back; outside a Screen it leads to `PlaceRoute`.
export const BackRoute = createContext<string | undefined>(undefined);

// A Split tells the Place it sits in that a record is open; below `tablet` of
// its width, where the record stands alone, the Place then leads with a back
// act to its route (in the switcher's stead in a touch top bar), and `false`
// takes it back.
export const RecordOpen = createContext<((open: boolean) => void) | null>(null);

// Whether a record is open in the Place's Split: below `tablet` the Toolbar
// over the list leaves with the list, the record standing alone.
export const RecordShown = createContext(false);

// A Thread standing in a Place's body or a Split's main tells it, which then
// gives the Thread the rest of its height and no inset, leaving scrolling to
// its log; a Section takes the call back, a Thread in it standing among the
// page's sections.
export const ThreadFills = createContext<((fills: boolean) => void) | null>(
	null,
);

// A Split's main keeps the page inset around the record's head, so a Thread
// filling it bleeds through the sides, its log and foot inset themselves.
export const ThreadBleeds = createContext(false);

// While a Thread fills a Split's main, the record's head over it stands in the
// Thread's column on the desktop.
export const OverThread = createContext(false);

// A bleeding touch Place hands the room its floating act needs to the regions
// that scroll inside its body, which keep it under their last row.
export const ActRoom = createContext<ReactNode>(null);

// The id of the Place's or Screen's title, which names a Split's list.
export const PageTitle = createContext<string | undefined>(undefined);

// A filling Thread's way back to its newest message while its reader is
// scrolled up, and `null` at the end: the region over its docked foot draws
// the Latest act from it.
export const ToLatest = createContext<(() => void) | null>(null);
