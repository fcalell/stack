import type { StatusState } from "@fcalell/ui-core/tokens";
import { statusContentTone, statusDot } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { inertProps, paintBox, useShown } from "../../lib/paint";
import { Spinner } from "../spinner";

const DOT = "shrink-0";

/** A status's mark alone (its dot, or a `Spinner` in the accent ink while `running`): beside its word in a `Status`, named by `label` as a list row's leading, or leading a status pick's option. Outside the package's exports. `painted` is the dot's box while its state is not here, nothing drawn in it. */
export function StatusDot({
	state,
	label,
	painted,
}: {
	state: StatusState;
	label?: string;
	painted?: boolean;
}) {
	const shown = useShown(painted);
	if (painted)
		return (
			<View
				{...inertProps(true)}
				className={cn(statusDot({ state: "done" }), DOT, paintBox(shown))}
			/>
		);
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
