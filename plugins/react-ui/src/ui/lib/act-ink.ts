import { createContext } from "react";

// Set by a `Banner` around its act: the text class of the banner's kind, which
// a quiet act draws in, as the banner's glyph does.
export const ActInk = createContext<string | undefined>(undefined);
