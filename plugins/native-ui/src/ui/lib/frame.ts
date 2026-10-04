import type { IconAct } from "@fcalell/ui-core/descriptors";
import {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
	useEffect,
	useRef,
} from "react";
import type { LayoutChangeEvent, View } from "react-native";

// What the frame molecules hand each other. The Shell hands its switcher's
// trigger to each Place, which starts its top bar with it; a Screen never
// reads it.
export const ShellSwitcher = createContext<ReactNode>(null);

// The Shell hands its tab bar to each Place, which draws it under its body; a
// pushed Screen never reads it, so it covers the tab bar from its first frame
// and clears the home indicator itself.
export const ShellTabs = createContext<ReactNode>(null);

// The box the toasts stand in, in the Shell's coordinates.
export interface ToastBox {
	top: number;
	height: number;
}

// The Shell's root and its way to place the toasts' layer. The layer stands
// after the sheets' host, outside the page's tree, so it takes the box the
// page draws (its body over the act's room, the foot and the tab bar) by
// measuring that box against the root.
export interface ToastFrame {
	root: RefObject<View | null>;
	place: (box: ToastBox) => void;
}
export const ToastFrame = createContext<ToastFrame | null>(null);

// The ref and `onLayout` of the box a page draws for the toasts: each layout
// of the box places the toasts' layer over it.
export function useToastBox() {
	const frame = useContext(ToastFrame);
	const box = useRef<View>(null);
	const onLayout = () => {
		const root = frame?.root.current;
		if (!root) return;
		box.current?.measureLayout(root, (_x, top, _width, height) =>
			frame.place({ top, height }),
		);
	};
	return { ref: box, onLayout };
}

// A filling Thread's docked input tells the Shell its height, whose toasts
// then stand above the input; 0 takes it back.
export const FootDocks = createContext<((height: number) => void) | null>(null);

// The `onLayout` of a docked input: it reports the input's height to
// `FootDocks` as the input grows, and leaving takes it back.
export function useFootDocks() {
	const docks = useContext(FootDocks);
	useEffect(() => {
		if (!docks) return;
		return () => docks(0);
	}, [docks]);
	return (event: LayoutChangeEvent) => {
		docks?.(event.nativeEvent.layout.height);
	};
}

// A Split lends its Details act to the Place or Screen it sits in, which
// draws it after its own actions; `undefined` takes it back.
export const LendAct = createContext<
	((act: IconAct | undefined) => void) | null
>(null);

// A Split's `beside` record is a Screen standing in its Place in the main's
// stead, not a page pushed over it, so it covers no tab bar. Its head stands
// alone, so it draws the Details act the Split lends while its pane is open;
// `null` outside a `beside`.
export interface BesideFrame {
	details?: IconAct;
}
export const Beside = createContext<BesideFrame | null>(null);

// A Split tells the Place it sits in that a record stands beside the main:
// that record's head is then the page's one and the Place draws none, and
// `false` takes it back.
export const BesideOpen = createContext<((open: boolean) => void) | null>(null);

// The route of the Shell's current place: the list a Place returns to from a
// record its Split shows alone.
export const PlaceRoute = createContext<string | undefined>(undefined);

// The route a Screen's back act returns to, where a read inside that answers
// not found leads back; outside a Screen it leads to `PlaceRoute`.
export const BackRoute = createContext<string | undefined>(undefined);

// A Split tells the Place it sits in that its record stands alone; the Place
// then starts its top bar with a back act to its route in place of the
// switcher, and `false` takes it back.
export const RecordAlone = createContext<((alone: boolean) => void) | null>(
	null,
);

// Whether the record stands alone in the Place's Split: the Toolbar over the
// list leaves with the list.
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

// A bleeding Place hands the room its floating act needs to the regions that
// scroll inside its body, which keep it under their last row.
export const ActRoom = createContext<ReactNode>(null);

// The Place's or Screen's title, which names a Split's list.
export const PageTitle = createContext<string | undefined>(undefined);

// A filling Thread's way back to its newest message while its reader is
// scrolled up, and `null` at the end: the region over its docked foot draws
// the Latest act from it.
export const ToLatest = createContext<(() => void) | null>(null);
