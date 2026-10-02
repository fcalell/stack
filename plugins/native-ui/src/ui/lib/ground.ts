import type { RowGround } from "@fcalell/ui-core/variants";
import { createContext } from "react";

// What holds a row: a `Group` runs its rows edge to edge at the card's inset;
// anywhere else (a `List`, a sheet) a row is the list's.
export const GroundContext = createContext<RowGround>("list");
