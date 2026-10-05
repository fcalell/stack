import { createContext } from "react";

// A row of a tree `List`: its depth (the roots 0), for a branch whether its
// children are drawn and how to fold them, and whether it is the tree's one
// tab stop. Undefined outside a tree.
export interface RowTree {
	depth: number;
	fold: { open: boolean; onToggle: () => void } | undefined;
	tabbable: boolean;
}

export const TreeContext = createContext<RowTree | undefined>(undefined);
