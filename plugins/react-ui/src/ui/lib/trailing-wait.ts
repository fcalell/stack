import { createContext } from "react";

// Set by a `List` around the rows of items it was given while it loads: each
// row draws its title and the rest as loaded, and its trailing value as a
// bar (the value is the part that arrives with the data).
export const TrailingWait = createContext(false);

// The trailing the List hands such a row in place of the value it cannot have
// yet: a count, so the row's trailing slot stands.
export const TRAILING_PLACEHOLDER = { count: 0 } as const;
