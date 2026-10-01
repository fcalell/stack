import { createContext } from "react";

// Set by a loading `Section` around its body: a `Group` or a `List` in it
// draws its own skeleton rows unless its own `loading` says otherwise.
export const LoadingContext = createContext(false);
