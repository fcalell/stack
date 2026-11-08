import { raisedGroundTokens, softGroundTokens } from "@fcalell/ui-core/emit";
import { type PropsWithChildren, useMemo } from "react";
import { ScopedVariables, useCSSVariable } from "uniwind";

// A ground's re-point as the variable it declares and the one it reads: a
// scoped variable on native takes a value, never a `var()`, so the scope
// resolves the read in the active mode.
interface Ground {
	names: string[];
	reads: string[];
}

function groundOf(tokens: Record<string, string>): Ground {
	return {
		names: Object.keys(tokens),
		reads: Object.values(tokens).map((value) =>
			value.slice("var(".length, -")".length),
		),
	};
}

function Repoint({ ground, children }: PropsWithChildren<{ ground: Ground }>) {
	const values = useCSSVariable(ground.reads);
	const variables = useMemo(() => {
		const scoped: Record<string, string | number> = {};
		ground.names.forEach((name, index) => {
			const value = values[index];
			if (value !== undefined) scoped[name] = value;
		});
		return scoped;
	}, [ground, values]);
	return <ScopedVariables variables={variables}>{children}</ScopedVariables>;
}

const RAISED = groundOf(raisedGroundTokens());
const SOFT = groundOf(softGroundTokens());

// A raised ground (`RAISED_GROUNDS`) for everything inside it: `edge` reads
// `edge-raised`, so a part's `border-edge` draws the raised hairline, as the
// web's rule on the grounds' fill classes does. Native has no selector, so
// each raised surface wraps its content in it.
export function RaisedGround({ children }: PropsWithChildren) {
	return <Repoint ground={RAISED}>{children}</Repoint>;
}

// A soft ground (`SOFT_GROUNDS`, a banner's tone) for everything inside it:
// `edge` reads `edge-strong`, so a part's `border-edge` is an edge on the tint.
export function SoftGround({ children }: PropsWithChildren) {
	return <Repoint ground={SOFT}>{children}</Repoint>;
}
