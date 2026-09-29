import { createContext, type ReactNode } from "react";

// The shell's `switcher`, handed to every `Place` it frames, which starts its
// top bar with it. A `Screen` never reads it.
export const SwitcherContext = createContext<ReactNode>(undefined);
