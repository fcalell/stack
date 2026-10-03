import { createContext } from "react";

// Set by a molecule whose frame clips (a Code's frame): an act inside it
// draws its focus ring inset, so the clip never cuts it.
export const InsetRing = createContext(false);
