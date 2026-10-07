import { createLeave, type Leave } from "@fcalell/ui-core/leave";
import { createContext, use, useMemo, useState } from "react";

// A `Form` or a `Sheet` is touched once a field inside it takes input. A
// blocked act inside shows its reason from then on, or once it is pressed;
// before either it is inert and the reason is unshown. Fields call `touch`
// on change. The same input edits its `leave`, which an `ActionBar`
// presses and a `Form` asks from when it is left: touched keeps its meaning
// (the reason shows) while the edit comes and goes with the act.
export interface Touched {
	touched: boolean;
	touch: () => void;
	leave: Leave;
}

export const TouchedContext = createContext<Touched>({
	touched: false,
	touch: () => {},
	leave: createLeave(),
});

export function useTouched(): Touched {
	return use(TouchedContext);
}

// A Form's or a Sheet's own touched state: the value its `TouchedContext`
// hands down, which changes only when it is touched or reset, and the setter
// that resets it. Its `leave` is one object for the life of the form, read
// when a leave is tried and so never state.
export function useTouchState() {
	const [touched, setTouched] = useState(false);
	const [leave] = useState(createLeave);
	const value = useMemo<Touched>(
		() => ({
			touched,
			touch: () => {
				leave.edit();
				setTouched(true);
			},
			leave,
		}),
		[touched, leave],
	);
	return [value, setTouched] as const;
}

// A sheet as it opens, and a new page (a wizard's, or the next queued
// decision's), has taken no input: `reset` runs during render, so the sheet
// never draws the last page's reason, while a closing sheet keeps its own
// until it is gone. Returns the page's key.
export function usePageTurn(
	open: boolean,
	title: string,
	description: string | undefined,
	reset: () => void,
) {
	const page = `${title}\n${description ?? ""}`;
	const [shown, setShown] = useState({ open, page });
	if (shown.open !== open || shown.page !== page) {
		setShown({ open, page });
		if (open) reset();
	}
	return page;
}
