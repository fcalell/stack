import { HAIRLINE } from "@fcalell/ui-core/variants";
import { cn } from "./cn";

// `GROUP`'s `divide-*` is a child selector uniwind drops, so each row of a
// group after the first draws the hairline above it, on its own wrapper.
export function between(index: number): string {
	return cn(index > 0 && "border-t", index > 0 && HAIRLINE);
}
