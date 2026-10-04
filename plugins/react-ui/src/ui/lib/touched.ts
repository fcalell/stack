import { createContext, use, useMemo, useState } from "react";

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

// A Form's or a Sheet's own touched state: the value its `TouchedContext`
// hands down, which changes only when it is touched or reset, and the setter
// that resets it.
export function useTouchState() {
	const [touched, setTouched] = useState(false);
	const value = useMemo<Touched>(
		() => ({ touched, touch: () => setTouched(true) }),
		[touched],
	);
	return [value, setTouched] as const;
}
