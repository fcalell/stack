import {
	roomMeasureTokens,
	roomTokens,
	roomUnitFor,
} from "@fcalell/ui-core/emit";
import { KNOB_DEFAULTS } from "@fcalell/ui-core/tokens";
import { type PropsWithChildren, useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { ScopedVariables } from "uniwind";

// The theme's `radius` knob, set once at startup by the generated theme
// source when it differs from the default, as `setLoading` is.
let roomRadius: number = KNOB_DEFAULTS.radius;
export function setRoomRadius(radius: number): void {
	roomRadius = radius;
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
			...roomTokens(scale, roomRadius),
			...roomMeasureTokens(scale),
		};
	}, [width, height]);
	return <ScopedVariables variables={variables}>{children}</ScopedVariables>;
}
