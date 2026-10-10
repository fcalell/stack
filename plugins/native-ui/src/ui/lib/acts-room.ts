import { createContext } from "react";

// Set by a `List` whose rows include one with a more act: a row of the list
// without one stands a blank square at its end, the more act's, so every
// row's trailing value ends at one x. The context is the only signal.
export const ActsRoom = createContext(false);
