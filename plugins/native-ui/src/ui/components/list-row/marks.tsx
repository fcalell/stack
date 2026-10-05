import { cn } from "@fcalell/ui-core/cn";
import {
	ROW_MARKS,
	rowWarningContentTone,
	text,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { Ink } from "../../lib/ink";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";

// The warning keeps its glyph and yields its label after the chip and before
// the row's first meta part.
const WARNING = "flex-row items-center min-w-icon-meta shrink-4";
const LABEL = "shrink min-w-0";

// What is wrong with a row: a warn glyph and its sentence in the meta ink,
// read after the word. Outside the package's exports.
export function WarningMark(props: { label: string }) {
	const words = useWords();
	return (
		<View
			accessible
			accessibilityLabel={`${words.warning}. ${props.label}`}
			className={cn(ROW_MARKS, WARNING)}
		>
			<Ink.Provider value={rowWarningContentTone()}>
				<Icon name="TriangleAlert" fit="meta" />
			</Ink.Provider>
			<RNText numberOfLines={1} className={cn(text({ role: "meta" }), LABEL)}>
				{props.label}
			</RNText>
		</View>
	);
}
