import {
	roomMeasureTokens,
	roomTokens,
	roomUnitFor,
} from "@fcalell/ui-core/emit";
import { KNOB_DEFAULTS } from "@fcalell/ui-core/tokens";
import { type PropsWithChildren, useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { ScopedVariables } from "uniwind";

// The theme's `radius` and `size` knobs, set once at startup by the generated
// theme source when either differs from the default, as `setLoading` is.
let roomKnobs = { radius: KNOB_DEFAULTS.radius, size: KNOB_DEFAULTS.size };
export function setRoomKnobs(knobs: { radius: number; size: number }): void {
	roomKnobs = knobs;
}

// The room set for everything inside it: each variable the web's room scope
// declares as a `calc` over its unit, here its canvas units times the unit of
// the window, since a scoped variable takes a value and never an expression.
// The scope follows the window, so a rotation or a resize rescales it.
export function RoomScope({ children }: PropsWithChildren) {
	const { width, height } = useWindowDimensions();
	const variables = useMemo(() => {
		const unit = roomUnitFor(width, height);
		const scale = (units: number) => units * unit;
		return {
			...roomTokens(scale, roomKnobs.radius, roomKnobs.size),
			...roomMeasureTokens(scale, roomKnobs.size),
		};
	}, [width, height]);
	return <ScopedVariables variables={variables}>{children}</ScopedVariables>;
}
