import type { IconAct, Switcher } from "@fcalell/ui-core/descriptors";
import {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
	useRef,
} from "react";
import type { View } from "react-native";
import type { Route } from "./route";

// What the frame molecules hand each other. The Shell hands its switcher to
// each Place, which draws its trigger at the start of its top bar; a Screen
// never reads it.
export const ShellSwitcher = createContext<Switcher | undefined>(undefined);

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
// TODO: the layer follows the box one layout late (a growing foot, the
// keyboard); place it by layout once React Native can stand a layer after the
// sheets' host from the page's tree, or once the sheets host the toasts.
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

// Whether the details sheet of a Split's pane is open, held by the Place or
// Screen the Split stands in as a direct child, which draws the sheet's
// Details act in its head from the Split's props; `null` for a Split that
// stands deeper, which draws as a plain region.
export interface DetailsState {
	open: boolean;
	setOpen: (open: boolean) => void;
}
export const DetailsOpen = createContext<DetailsState | null>(null);

// A Split's `beside` record is a Screen standing in its Place in the main's
// stead, not a page pushed over it, so it covers no tab bar. Its head stands
// alone, so it draws the Details act of the Split's pane while it is open;
// `null` outside a `beside`.
export interface BesideFrame {
	details?: IconAct;
}
export const Beside = createContext<BesideFrame | null>(null);

// The route of the Shell's current place: the list a Place returns to from a
// record its Split shows alone.
export const PlaceRoute = createContext<Route | undefined>(undefined);

// The route a Screen's back act returns to, where a read inside that answers
// not found leads back; outside a Screen it leads to `PlaceRoute`.
export const BackRoute = createContext<Route | undefined>(undefined);

// Whether the record of the Place's Split stands alone, read off the Split's
// props: the Toolbar over the list leaves with the list.
export const RecordShown = createContext(false);

// Whether a Thread standing here fills the region it stands in, which the
// Place or Split decides from its children in render (`holdsThread`): the
// region gives it the rest of its height and no inset, leaving scrolling to
// its log. False in a Section, where it stands among the page's sections.
export const ThreadRoom = createContext(false);

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
