import { createContext } from "react";

// Set by a `List` around the rows of items it was given while it loads: each
// row draws its title and the rest as loaded, and its trailing value as a
// bar (the value is the part that arrives with the data). The context is the
// only signal: the app's `trailing` slot is not read for such a row.
export const TrailingWait = createContext(false);
