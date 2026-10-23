import { raisedGroundTokens } from "@fcalell/ui-core/emit";
import { type PropsWithChildren, useMemo } from "react";
import { ScopedVariables, useCSSVariable } from "uniwind";

// The contract's re-point as the variable a raised ground declares and the
// one it reads: a scoped variable on native takes a value, never a `var()`,
// so the scope resolves the read in the active mode.
const NAMES = Object.keys(raisedGroundTokens());
const READS = Object.values(raisedGroundTokens()).map((value) =>
	value.slice("var(".length, -")".length),
);

// A raised ground (`RAISED_GROUNDS`) for everything inside it: `edge` reads
// `edge-raised`, so a part's `border-edge` draws the raised hairline, as the
// web's rule on the grounds' fill classes does. Native has no selector, so
// each raised surface wraps its content in it.
export function RaisedGround({ children }: PropsWithChildren) {
	const values = useCSSVariable(READS);
	const variables = useMemo(() => {
		const scoped: Record<string, string | number> = {};
		NAMES.forEach((name, index) => {
			const value = values[index];
			if (value !== undefined) scoped[name] = value;
		});
		return scoped;
	}, [values]);
	return <ScopedVariables variables={variables}>{children}</ScopedVariables>;
}
