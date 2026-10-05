import { createContext } from "react";

// A row of a tree `List`: its depth (the roots 0) and, for a branch, whether
// its children are drawn and how to fold them. Undefined outside a tree.
export interface RowTree {
	depth: number;
	fold: { open: boolean; onToggle: () => void } | undefined;
}

export const TreeContext = createContext<RowTree | undefined>(undefined);
