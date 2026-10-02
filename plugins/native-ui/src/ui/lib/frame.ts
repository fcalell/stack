import type { IconAct } from "@fcalell/ui-core/descriptors";
import { createContext, type ReactNode } from "react";

// What the frame molecules hand each other. The Shell hands its switcher's
// trigger to each Place, which starts its top bar with it; a Screen never
// reads it.
export const ShellSwitcher = createContext<ReactNode>(null);

// A pushed Screen covers the Shell's tab bar while it is mounted.
export const CoverTabs = createContext<((covered: boolean) => void) | null>(
	null,
);

// A Place whose act floats tells the Shell, whose toasts then stand above the
// act by its room.
export const ActFloats = createContext<((floats: boolean) => void) | null>(
	null,
);

// A Split lends its Details act to the Place or Screen it sits in, which
// draws it after its own actions; `undefined` takes it back.
export const LendAct = createContext<
	((act: IconAct | undefined) => void) | null
>(null);

// The route of the Shell's current place: the list a Place returns to from a
// record its Split shows alone.
export const PlaceRoute = createContext<string | undefined>(undefined);

// A Split tells the Place it sits in that its record stands alone; the Place
// then starts its top bar with a back act to its route in place of the
// switcher, and `false` takes it back.
export const RecordAlone = createContext<((alone: boolean) => void) | null>(
	null,
);

// Whether the record stands alone in the Place's Split: the Toolbar over the
// list leaves with the list.
export const RecordShown = createContext(false);

// A bleeding Place hands the room its floating act needs to the regions that
// scroll inside its body, which keep it under their last row.
export const ActRoom = createContext<ReactNode>(null);

// The Place's or Screen's title, which names a Split's list.
export const PageTitle = createContext<string | undefined>(undefined);
