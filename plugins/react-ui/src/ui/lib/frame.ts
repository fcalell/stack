import type { Dialog } from "@base-ui/react/dialog";
import { createContext, type ReactNode } from "react";

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

// A Split with a record and its pane open lends its details sheet's handle to
// the Place or Screen it sits in, which draws the sheet's trigger, the Details
// act, after its own actions below `wide` of its width; `undefined` takes it
// back.
export const LendAct = createContext<
	((sheet: Dialog.Handle<unknown> | undefined) => void) | null
>(null);

// The route of the Shell's current place: the list a Place returns to
// from a record its Split shows alone.
export const PlaceRoute = createContext<string | undefined>(undefined);

// A Split tells the Place it sits in that a record is open; below `tablet` of
// its width, where the record stands alone, the Place then leads with a back
// act to its route (in the switcher's stead in a touch top bar), and `false`
// takes it back.
export const RecordOpen = createContext<((open: boolean) => void) | null>(null);

// Whether a record is open in the Place's Split: below `tablet` the Toolbar
// over the list leaves with the list, the record standing alone.
export const RecordShown = createContext(false);

// A bleeding touch Place hands the room its floating act needs to the regions
// that scroll inside its body, which keep it under their last row.
export const ActRoom = createContext<ReactNode>(null);

// The id of the Place's or Screen's title, which names a Split's list.
export const PageTitle = createContext<string | undefined>(undefined);
