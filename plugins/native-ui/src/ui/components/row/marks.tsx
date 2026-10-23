import { cn } from "@fcalell/ui-core/cn";
import type { RowMark } from "@fcalell/ui-core/descriptors";
import {
	ROW_FLAG,
	ROW_MARKS,
	ROW_RING,
	ROW_RING_FILLED,
	rowWarningContentTone,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { LayoutChangeEvent } from "react-native";
import { View } from "react-native";
import { Ink } from "../../lib/ink";
import { clipWhen, Painted, PaintText } from "../../lib/paint";
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

// Beside the text group's floor a mark stands whole in a slot of its own
// (`useMarksFold` decides how many stand). The first gives way last, only where
// it alone is wider than the room; a folded one is not drawn: out of the flow
// and unseen, whole as it is, so it is measured and stays in the row's content
// for a screen reader.
const SLOT = "flex-row shrink-0";
const SLOT_FIRST = "flex-row shrink min-w-0";
const SLOT_FOLDED = "absolute right-0 flex-row opacity-0";

// The slot of the mark at place `at` of a row's marks, of which `shown` stand;
// its layout is the mark's width. A mark that takes a press (the lock that links)
// is `linked`: the slot lets it through while it stands. Outside the package's
// exports.
export function MarkSlot(props: {
	at: number;
	// Absent where the text group has no floor: the marks are not measured and all stand.
	shown?: number;
	linked?: boolean;
	onMark?: (at: number) => (event: LayoutChangeEvent) => void;
	children: ReactNode;
}) {
	const { at, shown, linked, onMark, children } = props;
	const stands = shown === undefined || at < shown;
	let form = SLOT;
	if (!stands) form = SLOT_FOLDED;
	else if (at === 0) form = SLOT_FIRST;
	return (
		<View
			pointerEvents={linked && stands ? "box-none" : "none"}
			onLayout={onMark?.(at)}
			className={form}
		>
			{children}
		</View>
	);
}

// A row's boolean mark: the required ring (filled and named when it holds, a
// bare outline and unnamed when not: the fact's absence) or a flag glyph in the
// meta ink, each named by its label.
export function BooleanMark({ mark }: { mark: RowMark }) {
	if ("ring" in mark) {
		if (!mark.ring)
			return (
				<View
					accessible={false}
					importantForAccessibility="no-hide-descendants"
					className={ROW_RING}
				/>
			);
		return (
			<View
				accessible
				accessibilityRole="image"
				accessibilityLabel={mark.label}
				className={cn(ROW_RING, ROW_RING_FILLED)}
			/>
		);
	}
	return (
		<View
			accessible
			accessibilityRole="image"
			accessibilityLabel={mark.label}
			className={ROW_FLAG}
		>
			<Ink.Provider value="ink-meta">
				<IconBase name={mark.flag} fit="meta" stroke="line" />
			</Ink.Provider>
		</View>
	);
}
