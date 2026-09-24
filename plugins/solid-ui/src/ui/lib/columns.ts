import { createContext, useContext } from "solid-js";

// Inside `Columns` a `ListRow` is drawn as a card; the row reads this.
export const ColumnsContext = createContext(false);

export function useInColumns(): boolean {
	return useContext(ColumnsContext);
}
