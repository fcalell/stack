import { createContext } from "react";

// Set by a loading `Section` around its body: a `Group` or a `List` in it
// draws its own skeleton rows (a List's in the slots its `row` declares).
export const LoadingContext = createContext(false);
