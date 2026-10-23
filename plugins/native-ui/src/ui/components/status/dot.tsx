import type { Tone } from "@fcalell/ui-core/tokens";
import { statusContentTone, statusDot } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { inertProps, PAINT_BOX, PaintView } from "../../lib/paint";
import { Swap } from "../../lib/swap";
import { Spinner } from "../spinner";

const DOT = "shrink-0";

/** A status's mark alone (its dot, or a `Spinner` in the accent ink while `running`): beside its word in a `Status`, named by `label` as a list row's leading, or leading a status pick's option. Outside the package's exports. `painted` is the dot's box while its state is not here, nothing drawn in it. */
export function StatusDot({
	tone,
	label,
	painted,
}: {
	tone: Tone;
	label?: string;
	painted?: boolean;
}) {
	if (painted)
		return (
			<PaintView
				painted
				{...inertProps(true)}
				className={cn(statusDot({ tone: "done" }), DOT, PAINT_BOX)}
			/>
		);
	// A view takes no currentColor: the spinner's ink is the status's tone.
	const drawn = tone === "running" ? DOT : cn(statusDot({ tone }), DOT);
	const mark =
		tone === "running" ? (
			<Ink.Provider value={statusContentTone(tone)}>
				<Spinner />
			</Ink.Provider>
		) : null;
	// A state that changes while shown is a mark change: the new dot grows in as
	// the old one fades out.
	return (
		<Swap id={tone} scale>
			{label ? (
				<View
					accessible
					accessibilityRole="image"
					accessibilityLabel={label}
					className={drawn}
				>
					{mark}
				</View>
			) : (
				<View className={drawn}>{mark}</View>
			)}
		</Swap>
	);
}
