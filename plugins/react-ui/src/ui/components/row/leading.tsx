import { Field } from "@base-ui/react/field";
import { cn } from "@fcalell/ui-core/cn";
import type { RowLeading } from "@fcalell/ui-core/descriptors";
import type { ChipFamily, Words } from "@fcalell/ui-core/tokens";
import { rowMark, TREE_BLEED, TREE_RAIL } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { useWords } from "../../lib/words.tsx";
import { AvatarBase } from "../avatar/base.tsx";
import { IconButtonBase, Named } from "../button/glyph.tsx";
import { Icon, IconBase } from "../icon/index.tsx";
import { StatusDot } from "../status/dot.tsx";
import { HeldCheckbox } from "../switch/checkbox.tsx";

// The box one body line tall a part stands in, centred on the first line; a
// taller part overflows it centred.
const FIRST_LINE = "flex shrink-0 items-center h-line-body";
// A named type mark lets the pointer rest on it, above the row's hit; on touch
// it stays passive.
const NAMED_LEADING = "relative pointer-events-auto touch:pointer-events-none";
const GLYPH = "flex text-ink-meta";
const NOOP = () => {};
// A tree row's levels and fold lane stand as one box that runs the row's full
// height, over its padding, so a level's rail is unbroken from row to row.
const TREE = "flex shrink-0 self-stretch";

// A row of a tree Section: its depth (the roots 0), for a branch whether its
// children are drawn and how to fold them, and whether it is the tree's one
// tab stop.
export interface RowTree {
	depth: number;
	/** The row's place among its siblings (`place` of `size`, from 1), which the rows a window leaves unmounted do not tell. */
	size: number;
	place: number;
	/** The item's key, which the tree's keys find the row by. */
	key: string;
	fold: { open: boolean; onToggle: () => void } | undefined;
	tabbable: boolean;
}

// A part standing on the title's first line while the title wraps whole.
export function First(props: { on: boolean; children: ReactNode }) {
	if (!props.on) return props.children;
	return <span className={FIRST_LINE}>{props.children}</span>;
}

// A tree row's rails: one per level, running the row's full height. A
// branch's fold act stands in the end group (`treeFold`), so no row reserves
// a lane for one.
export function TreeLead(props: { tree: RowTree }) {
	const { tree } = props;
	const levels = Array.from({ length: tree.depth }, (_, level) => level);
	if (levels.length === 0) return null;
	return (
		<span className={cn(TREE, TREE_BLEED)}>
			{levels.map((level) => (
				<span key={level} className={TREE_RAIL} />
			))}
		</span>
	);
}

// A branch's fold act, first in the row's end group.
export function treeFold(
	tree: RowTree,
	named: string,
	words: Words,
): ReactNode {
	const { fold } = tree;
	if (!fold) return null;
	return (
		<IconButtonBase
			icon="ChevronDown"
			open={fold.open}
			label={`${fold.open ? words.collapse : words.expand} ${named}`}
			aria-expanded={fold.open}
			tabIndex={-1}
			onClick={fold.onToggle}
		/>
	);
}

export function Leading(props: {
	leading: RowLeading;
	named: string;
	painted: boolean;
	tabIndex?: -1;
}) {
	const words = useWords();
	const { leading, painted, tabIndex } = props;
	// Painted, the kind is the slot's shape; what the marks name is not here.
	if (painted) {
		if ("check" in leading)
			return <HeldCheckbox checked={false} onChange={NOOP} label="" painted />;
		if ("avatar" in leading) return <AvatarBase name="" painted />;
		if ("status" in leading) return <StatusDot tone="done" painted />;
		if ("mark" in leading)
			return <span aria-hidden className={rowMark({ family: "neutral" })} />;
		return <IconBase name="File" stroke="line" painted />;
	}
	if ("check" in leading)
		return (
			<Field.Root disabled={leading.check.blocked !== undefined}>
				<HeldCheckbox
					checked={leading.check.checked}
					onChange={leading.check.onChange}
					label={props.named}
					tabIndex={tabIndex}
				/>
			</Field.Root>
		);
	if ("avatar" in leading)
		return <AvatarBase name={leading.avatar.name} src={leading.avatar.src} />;
	if ("status" in leading)
		return <StatusDot tone={leading.status} label={words[leading.status]} />;
	if ("mark" in leading) return <TypeMark leading={leading} />;
	return (
		<span className={GLYPH}>
			<Icon name={leading.icon} />
		</span>
	);
}

// A type's mark: named, with its tooltip, when it has a label; decorative and
// hidden without one.
function TypeMark({
	leading,
}: {
	leading: { mark: string; family: ChipFamily; label?: string };
}) {
	const { mark, family, label } = leading;
	if (label === undefined)
		return (
			<span aria-hidden className={rowMark({ family })}>
				{mark}
			</span>
		);
	return (
		<Named label={label}>
			<span
				role="img"
				aria-label={label}
				className={cn(rowMark({ family }), NAMED_LEADING)}
			>
				{mark}
			</span>
		</Named>
	);
}
