import { createContext } from "react";

// Set by a loading `Section` around its body: a `Group` or a `List` in it
// draws its own skeleton rows unless its own `loading` says otherwise.
export const LoadingContext = createContext(false);

// Set by a molecule whose loading rows stand in for rows of another shape
// than a `List`'s own (a `Table` below `tablet`: a two-line row with a
// trailing value and no leading).
export const LoadingRow = createContext<"two-line" | "two-line-trailing">(
	"two-line",
);
