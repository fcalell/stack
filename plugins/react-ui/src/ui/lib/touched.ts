import { createContext, use } from "react";

// A `Form` or a `Sheet` is touched once a field inside it takes input. A
// blocked act inside shows its reason from then on, or once it is pressed;
// before either it is inert and the reason is only announced. Fields call
// `touch` on change.
export interface Touched {
	touched: boolean;
	touch: () => void;
}

export const TouchedContext = createContext<Touched>({
	touched: false,
	touch: () => {},
});

export function useTouched(): Touched {
	return use(TouchedContext);
}
