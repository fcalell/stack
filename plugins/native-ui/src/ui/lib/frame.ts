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

// A Split lends its Details act to the Place or Screen it sits in, which
// draws it after its own actions; `undefined` takes it back.
export const LendAct = createContext<
	((act: IconAct | undefined) => void) | null
>(null);

// The Place's or Screen's title, which names a Split's list.
export const PageTitle = createContext<string | undefined>(undefined);
