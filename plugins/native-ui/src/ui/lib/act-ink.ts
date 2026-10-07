import type { ContentTone } from "@fcalell/ui-core/variants";
import { createContext } from "react";

// Set by a `Banner` around its act: the text class and the glyph ink of the
// banner's kind, which a quiet act draws in, as the banner's glyph does.
export interface ActInkValue {
	label: string;
	tone: ContentTone;
}

export const ActInk = createContext<ActInkValue | undefined>(undefined);
