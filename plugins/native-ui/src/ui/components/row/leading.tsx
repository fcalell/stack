import type { RowLeading } from "@fcalell/ui-core/descriptors";
import {
	type RowLines,
	rowMark,
	TREE_RAIL,
	treeBleed,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { FieldDisabled } from "../../lib/field";
import { Ink } from "../../lib/ink";
import { useWords } from "../../lib/words";
import { AvatarBase } from "../avatar/base";
import { IconButtonBase } from "../button/glyph";
import { Icon, IconBase } from "../icon";
import { StatusDot } from "../status/dot";
import { HeldCheckbox } from "../switch/checkbox";

// The box one body line tall a part stands in, centred on the first line; a
// taller part overflows it centred.
const FIRST_LINE = "flex-row shrink-0 items-center h-line-body";
// A tree row's levels stand as one box that runs the row's full height, over
// its padding, so a level's rail is unbroken from row to row. A press on it
// falls through to the row's hit.
const TREE = "flex-row shrink-0 self-stretch";
const NOOP = () => {};

/** A row of a tree Section: its depth (the roots 0) and, for a branch, whether its children are drawn and how to fold them. */
export interface RowTree {
	depth: number;
	fold: { open: boolean; onToggle: () => void } | undefined;
}

// A part standing on the title's first line while the title wraps whole.
export function First(props: { on: boolean; children: ReactNode }) {
	if (!props.on) return props.children;
	return (
		<View pointerEvents="box-none" className={FIRST_LINE}>
			{props.children}
		</View>
	);
}

// A tree row's rails: one per level, running the row's full height. A branch's
// fold act stands in the end group (`treeFold`), so no row reserves a lane for
// one.
export function TreeLead(props: { tree: RowTree; lines: RowLines }) {
	const { tree, lines } = props;
	if (tree.depth === 0) return null;
	const levels = Array.from({ length: tree.depth }, (_, level) => level);
	return (
		<View pointerEvents="none" className={cn(TREE, treeBleed({ lines }))}>
			{levels.map((level) => (
				<View key={level} className={TREE_RAIL} />
			))}
		</View>
	);
}

// A branch's fold act, last in the row's end group.
export function TreeFold(props: { tree: RowTree; named: string }) {
	const words = useWords();
	const { fold } = props.tree;
	if (!fold) return null;
	return (
		<IconButtonBase
			icon="ChevronDown"
			label={`${fold.open ? words.collapse : words.expand} ${props.named}`}
			onAct={fold.onToggle}
			expanded={fold.open}
		/>
	);
}

export function Leading(props: {
	leading: RowLeading;
	named: string;
	painted: boolean;
}) {
	const words = useWords();
	const { leading, named, painted } = props;
	// Painted, the kind is the slot's shape; what the marks name is not here.
	if (painted) {
		if ("check" in leading)
			return <HeldCheckbox checked={false} onChange={NOOP} label="" painted />;
		if ("avatar" in leading) return <AvatarBase name="" painted />;
		if ("status" in leading) return <StatusDot tone="done" painted />;
		if ("mark" in leading)
			return <View className={rowMark({ family: "neutral" })} />;
		return <IconBase name="File" stroke="line" painted />;
	}
	if ("check" in leading)
		return (
			<FieldDisabled.Provider value={leading.check.blocked !== undefined}>
				<HeldCheckbox
					checked={leading.check.checked}
					onChange={leading.check.onChange}
					label={named}
				/>
			</FieldDisabled.Provider>
		);
	if ("avatar" in leading)
		return <AvatarBase name={leading.avatar.name} src={leading.avatar.src} />;
	if ("status" in leading)
		return <StatusDot tone={leading.status} label={words[leading.status]} />;
	if ("mark" in leading)
		return (
			<RNText
				{...(leading.label === undefined
					? {
							accessible: false,
							importantForAccessibility: "no-hide-descendants" as const,
						}
					: { accessible: true, accessibilityLabel: leading.label })}
				className={rowMark({ family: leading.family })}
			>
				{leading.mark}
			</RNText>
		);
	return (
		<Ink.Provider value="ink-meta">
			<Icon name={leading.icon} />
		</Ink.Provider>
	);
}
