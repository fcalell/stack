import { createContext, useContext } from "solid-js";

// What a `Table` tells the control that edits one of its cells in place: a
// `Picker` there opens at once, since the tap that made it the editor was
// the tap on its value, and reports its close, so the cell draws its value
// again whether or not a pick was made.
export interface CellContextValue {
	close: () => void;
}

export const CellContext = createContext<CellContextValue>();

export function useCell(): CellContextValue | undefined {
	return useContext(CellContext);
}
