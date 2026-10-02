import type { RowGround } from "@fcalell/ui-core/variants";
import { createContext } from "react";

// What holds a row: a `Group` runs its rows edge to edge at the card's inset;
// anywhere else (a `List`, a popover) a row is an inset rounded wash.
export const GroundContext = createContext<RowGround>("list");
