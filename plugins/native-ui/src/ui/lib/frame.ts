import type { LinkAct, Switcher } from "@fcalell/ui-core/descriptors";
import {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";
import type { LayoutChangeEvent, View } from "react-native";
import type { Route } from "./route";
import { useCSSVariable } from "./theme";

// What the frame molecules hand each other. The Shell hands its switcher to
// each Pane, which draws its trigger at the start of its bar when it has no
// back act.
export const ShellSwitcher = createContext<Switcher | undefined>(undefined);

// The Shell hands its tab bar to each Place, which draws it under its Pane.
export const ShellTabs = createContext<ReactNode>(null);

// The box the toasts stand in, in the Shell's coordinates.
export interface ToastBox {
	top: number;
	height: number;
}

// The Shell's root and its way to place the toasts' layer. The layer stands
// after the sheets' host, outside the page's tree, so it takes the box the
// Pane draws (its body over its docked foot and the tab bar) by measuring
// that box against the root.
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

// The way to the first of the Shell's places that is an address of the app:
// where the page for an address nothing serves leads. `undefined` outside a
// Shell, which is how that page knows whether it stands in one.
export const ShellHome = createContext<LinkAct | undefined>(undefined);

// The route of the Shell's current place, where a read with no Pane's `back`
// around it leads back.
export const PlaceRoute = createContext<Route | undefined>(undefined);

// The route a Pane's back act returns to, where a read inside that answers
// not found leads back; with none a read leads to `PlaceRoute`.
export const BackRoute = createContext<Route | undefined>(undefined);

// Whether the Place is read from across a room (`distance` `room`): the Pane
// leaves out the switcher, which the room set has no tab bar for.
export const DistanceContext = createContext(false);

// What a docked foot's region hands the docked `Sheet` it draws: `height` is the
// region the foot shares with what stands over it (a Thread's or a Pane's
// `Lifted` column), read off that column's layout since Yoga has no
// container units; `chrome` the foot's own block padding and border;
// `logFloor` what the region keeps for a log above the foot (zero where none
// shares it). All zero until the first layout.
export interface FootRegionValue {
	height: number;
	chrome: number;
	logFloor: number;
}

// `logged` is whether a log shares the region with the foot.
export function useFootRegion(logged: boolean) {
	const [height, setHeight] = useState(0);
	const onLayout = (event: LayoutChangeEvent) =>
		setHeight(event.nativeEvent.layout.height);
	const acts = tokenPx(useCSSVariable("--spacing-acts"));
	const hairline = tokenPx(useCSSVariable("--spacing-hairline"));
	const logFloor = tokenPx(useCSSVariable("--spacing-docked-log-floor"));
	const value = useMemo(
		() => ({
			height,
			chrome: 2 * acts + hairline,
			logFloor: logged ? logFloor : 0,
		}),
		[height, acts, hairline, logFloor, logged],
	);
	return { value, onLayout };
}

// A size token as the layout reads it, zero while it is unset.
export function tokenPx(value: unknown): number {
	return Number.parseFloat(String(value ?? 0));
}

// The claim a docked foot region holds for the input that returns: a docked
// `Sheet` leaving the region sets it, and the `MessageInput` that mounts in
// its place takes focus and clears it (React runs the leaving tree's cleanups
// before the arriving tree's effects).
export const FootReturn = createContext<RefObject<boolean> | null>(null);
