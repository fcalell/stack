import { createContext, useContext, useState } from "react";

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
