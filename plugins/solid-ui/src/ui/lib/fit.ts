import type { ButtonFit } from "@fcalell/ui-core/variants";
import { createContext, useContext } from "solid-js";

// Where a control sits: the body, at the 44 px floor, or a top bar, where a
// button or a circle draws compact. A top bar provides `bar`; everything else
// reads the default.
export const FitContext = createContext<ButtonFit>("body");

export function useFit(): ButtonFit {
	return useContext(FitContext);
}

// A compact control keeps the 44 px hit area: a transparent layer reaching
// past it, 6 px on each side of 32.
export const BAR_HIT =
	"relative before:absolute before:-inset-1.5 before:content-['']";
