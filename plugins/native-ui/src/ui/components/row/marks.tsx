import type { RowMark } from "@fcalell/ui-core/descriptors";
import {
	ROW_FLAG,
	ROW_MARKS,
	ROW_RING,
	ROW_RING_FILLED,
	rowWarningContentTone,
	text,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { clipWhen, Painted, PaintText } from "../../lib/paint";
import { IconBase } from "../icon";

// A mark's glyph beside its label, the label truncating before the glyph
// does: a row's meta line wraps its marks whole, so a label is cut only where
// it alone is wider than the line.
const MARK = "flex-row items-center min-w-icon-meta shrink";
const LABEL = "shrink min-w-0";

// What is wrong with a row: a warn glyph and its sentence in the meta ink;
// `painted` while the sentence is not here, the glyph's box and a phrase's
// filler. Outside the package's exports.
export function WarningMark(props: { label: string; painted?: boolean }) {
	return (
		<View pointerEvents="none" className={cn(ROW_MARKS, MARK)}>
			<Ink.Provider value={rowWarningContentTone()}>
				<IconBase
					name="TriangleAlert"
					fit="meta"
					stroke="line"
					painted={props.painted}
				/>
			</Ink.Provider>
			<PaintText
				fills="phrase"
				painted={props.painted}
				numberOfLines={1}
				{...clipWhen(props.painted)}
				className={cn(text({ role: "meta" }), LABEL)}
			>
				{props.painted ? <Painted role="phrase" /> : props.label}
			</PaintText>
		</View>
	);
}

// A row's boolean mark: the required ring (filled while it holds) or a flag
// glyph in the meta ink, each beside its label, the meta line's words. A ring
// that does not hold says no fact, so the row draws none.
export function BooleanMark({ mark }: { mark: RowMark }) {
	const glyph =
		"ring" in mark ? (
			<View className={cn(ROW_RING, ROW_RING_FILLED)} />
		) : (
			<View className={ROW_FLAG}>
				<Ink.Provider value="ink-meta">
					<IconBase name={mark.flag} fit="meta" stroke="line" />
				</Ink.Provider>
			</View>
		);
	return (
		<View pointerEvents="none" className={cn(ROW_MARKS, MARK)}>
			{glyph}
			<RNText numberOfLines={1} className={cn(text({ role: "meta" }), LABEL)}>
				{mark.label}
			</RNText>
		</View>
	);
}

/** Whether a boolean mark says a fact: a ring says one only while it holds. */
export function says(mark: RowMark): boolean {
	return !("ring" in mark) || mark.ring;
}
