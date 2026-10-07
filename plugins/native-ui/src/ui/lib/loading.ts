import { createContext } from "react";

// Set by a loading `Section` or `Group` around its body: each part in it that
// has a waiting form (a `List`, a `Prose`, a `Meter`, a `Slider`, a
// `DefinitionRow`, a `Code`, a `Thread`) draws it, a List's in the slots its
// `row` declares.
export const LoadingContext = createContext(false);
