import {
	type Accessor,
	createContext,
	createSignal,
	onCleanup,
	useContext,
} from "solid-js";

// A `Place` or a `Screen` measures its body at the reading width, centred in
// its column. A child that lays sections side by side (`Columns`) or draws a
// grid (`Table`) claims the column's whole width for as long as it is
// mounted. Claims are counted, so two claimants, or a claimant mounting
// before the one it replaces is disposed, never hand the column back while
// one is still drawn.
export interface WidthClaims {
	whole: Accessor<boolean>;
	// Holds the whole width until the returned release runs.
	claim: () => () => void;
}

export function createWidthClaims(): WidthClaims {
	const [count, setCount] = createSignal(0);
	return {
		whole: () => count() > 0,
		claim() {
			let held = true;
			setCount((n) => n + 1);
			return () => {
				if (!held) return;
				held = false;
				setCount((n) => n - 1);
			};
		},
	};
}

export const MeasureContext = createContext<WidthClaims["claim"]>();

export function useWholeWidth(): void {
	const claim = useContext(MeasureContext);
	if (claim) onCleanup(claim());
}

// The body's class under the measure: the reading width, or the whole column.
export const measured = (whole: boolean) =>
	whole ? "w-full" : "mx-auto w-full max-w-reading";
