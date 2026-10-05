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

// The warning keeps its width (the chip, after it, yields first, and past
// the chip the meta line clips at the row's edge). The lock is its glyph
// alone on the phone, its label read aloud.
const WARNING = "flex-row items-center shrink-0";
const LOCK = "flex-row items-center shrink-0";

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
			<RNText numberOfLines={1} className={text({ role: "meta" })}>
				{props.label}
			</RNText>
		</View>
	);
}

// What a row holds: a lock glyph alone, its label read aloud. Outside the
// package's exports.
export function LockMark(props: { label: string }) {
	return (
		<View accessible accessibilityLabel={props.label} className={LOCK}>
			<Ink.Provider value="ink-meta">
				<Icon name="Lock" fit="meta" />
			</Ink.Provider>
		</View>
	);
}
