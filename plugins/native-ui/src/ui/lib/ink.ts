import type { ContentTone } from "@fcalell/ui-core/variants";
import { createContext, useContext } from "react";

// The ink of the place a glyph or a spinner sits in: the native form of the
// web's currentColor, which a React Native view never inherits. The place
// that draws an ink (a labelled act, an icon act) provides it; unset
// elsewhere, where each atom keeps its own.
export const Ink = createContext<ContentTone | undefined>(undefined);

export function useInk(): ContentTone | undefined {
	return useContext(Ink);
}
