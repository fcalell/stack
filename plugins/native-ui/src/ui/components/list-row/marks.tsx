import { cn } from "@fcalell/ui-core/cn";
import {
	ROW_MARKS,
	rowWarningContentTone,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { LayoutChangeEvent } from "react-native";
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

// Beside the text group's floor a mark stands whole in a slot of its own
// (`useMarksFold` decides how many stand). The first gives way last, only where
// it alone is wider than the room; a folded one is not drawn: out of the flow
// and unseen, whole as it is, so it is measured and stays in the row's content
// for a screen reader.
const SLOT = "flex-row shrink-0";
const SLOT_FIRST = "flex-row shrink min-w-0";
const SLOT_FOLDED = "absolute right-0 flex-row opacity-0";

// The slot of the mark at place `at` of a row's marks, of which `shown` stand;
// its layout is the mark's width. Outside the package's exports.
export function MarkSlot(props: {
	at: number;
	shown: number;
	onMark: (at: number) => (event: LayoutChangeEvent) => void;
	children: ReactNode;
}) {
	const { at, shown, onMark, children } = props;
	let form = SLOT;
	if (at >= shown) form = SLOT_FOLDED;
	else if (at === 0) form = SLOT_FIRST;
	return (
		<View pointerEvents="none" onLayout={onMark(at)} className={form}>
			{children}
		</View>
	);
}
