import { createContext, useContext } from "react";

// A `Form` or a `Sheet` is touched once a field inside it takes input. A
// blocked act inside says its reason from then on, or once it is pressed;
// before either it is disabled and silent. Fields call `touch` on change.
export interface Touched {
	touched: boolean;
	touch: () => void;
}

export const TouchedContext = createContext<Touched>({
	touched: false,
	touch: () => {},
});

export function useTouched(): Touched {
	return useContext(TouchedContext);
}
