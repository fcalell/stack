import type { StatusState } from "@fcalell/ui-core/tokens";
import { statusContentTone, statusDot } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { Spinner } from "../spinner";

const DOT = "shrink-0";

/** A status's mark alone (its dot, or a `Spinner` in the accent ink while `running`): beside its word in a `Status`, named by `label` as a list row's leading, or leading a status pick's option. Outside the package's exports. */
export function StatusDot({
	state,
	label,
}: {
	state: StatusState;
	label?: string;
}) {
	// A view takes no currentColor: the spinner's ink is the status's tone.
	const drawn = state === "running" ? DOT : cn(statusDot({ state }), DOT);
	const mark =
		state === "running" ? (
			<Ink.Provider value={statusContentTone(state)}>
				<Spinner />
			</Ink.Provider>
		) : null;
	if (label)
		return (
			<View
				accessible
				accessibilityRole="image"
				accessibilityLabel={label}
				className={drawn}
			>
				{mark}
			</View>
		);
	return <View className={drawn}>{mark}</View>;
}
