import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge className strings, letting later Tailwind utilities win over earlier
// conflicting ones. uniwind compiles the resolved className the same way it
// would a hand-written one, so this carries no runtime style cost.
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
