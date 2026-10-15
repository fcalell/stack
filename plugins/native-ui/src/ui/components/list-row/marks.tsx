import { cn } from "@fcalell/ui-core/cn";
import {
	ROW_MARKS,
	rowWarningContentTone,
	text,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { Ink } from "../../lib/ink";
import { clipWhen, Painted } from "../../lib/paint";
import { IconBase } from "../icon";

// The warning keeps its glyph and yields its label after the chip and before
// the row's first meta part.
const WARNING = "flex-row items-center min-w-icon-meta shrink-10000000";
const LABEL = "shrink min-w-0";

// What is wrong with a row: a warn glyph and its sentence in the meta ink;
// `painted` while the sentence is not here, the glyph's box and a phrase's
// filler. Outside the package's exports.
export function WarningMark(props: { label: string; painted?: boolean }) {
	return (
		<View className={cn(ROW_MARKS, WARNING)}>
			<Ink.Provider value={rowWarningContentTone()}>
				<IconBase
					name="TriangleAlert"
					fit="meta"
					stroke="line"
					painted={props.painted}
				/>
			</Ink.Provider>
			<RNText
				numberOfLines={1}
				{...clipWhen(props.painted)}
				className={cn(text({ role: "meta" }), LABEL)}
			>
				{props.painted ? <Painted role="phrase" /> : props.label}
			</RNText>
		</View>
	);
}
