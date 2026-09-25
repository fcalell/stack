import { createContext, onCleanup, useContext } from "solid-js";

// A `Place` or a `Screen` measures its body at the reading width, centred in
// its column. A child that lays sections side by side (`Columns`) claims the
// column's whole width for as long as it is mounted.
export const MeasureContext = createContext<(whole: boolean) => void>();

export function useWholeWidth(): void {
	const claim = useContext(MeasureContext);
	if (!claim) return;
	claim(true);
	onCleanup(() => claim(false));
}

// The body's class under the measure: the reading width, or the whole column.
export const measured = (whole: boolean) =>
	whole ? "w-full" : "mx-auto w-full max-w-reading";
