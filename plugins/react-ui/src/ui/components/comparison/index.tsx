import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { StatusMark } from "@fcalell/ui-core/descriptors";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import {
	COMPARISON_LABEL,
	COMPARISON_ROW,
	FIGURES,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { memo, useRef } from "react";
import type { Closed } from "../../lib/closed.ts";
import { Painted } from "../../lib/paint.tsx";
import { FrameBody, FrameLine, useCollection } from "../../lib/read.tsx";
import { Window } from "../../lib/window.tsx";
import { ChipBase } from "../chip/base.tsx";
import { Chip } from "../chip/index.tsx";
import { GroupCard } from "../group/base.tsx";
import { StatusBase } from "../status/base.tsx";
import { Status } from "../status/index.tsx";

const ROW = "flex items-baseline flex-wrap";
// The head's cell over the labels; on touch the label stands on its own line
// over the values, so the corner leaves the layout.
const CORNER = "basis-0 grow min-w-0 touch:hidden";
// A word wider than its column hyphenates in the document's language before
// it breaks; a wrapped value leaves no lone word on its last line.
const COLUMN = "basis-0 grow min-w-0 hyphens-auto text-pretty";
const LABEL =
	"flex flex-wrap basis-0 grow min-w-0 items-center touch:basis-full";
const LABEL_TEXT = "min-w-0";
// A chip or a verdict keeps its width beside a label that wraps.
const MARK = "inline-flex shrink-0";

/** One function per fact slot, each called with an item (over the placeholder while the facts paint); the slots given are the shape the painted facts draw. */
export interface FactSlots<T> {
	/** The item's React key, unique in the comparison. */
	key: (item: T) => string;
	/** The fact's label (a short phrase; wraps). */
	label: (item: T) => string;
	/** The fact's value under each column, in the columns' order (each a short phrase; wraps). */
	values: (item: T) => readonly string[];
	/** The chips beside the fact's label (each a word; truncates past the short measure, 18 characters). */
	chips?: (item: T) => readonly string[] | undefined;
	/** The fact's verdict, drawn after the label and its chips; a passing fact returns undefined, or a done mark where the screen reads the pass out. */
	status?: (item: T) => StatusMark | undefined;
}

/** Facts set side by side across two or three columns, from items. */
export type ComparisonProps<T = unknown> = Closed & {
	/** The items the facts draw: constants, or a selection, which paints `PAINT_ROWS` facts until its read lands. A selection is the comparison's own frame: it holds its read and draws the failed, missing and empty forms in its own box whatever stands above it. */
	items: Datum<readonly T[]>;
	/** What the columns compare, the table's accessible name (a short phrase; read aloud, never drawn). */
	label: string;
	/** The compared things' labels, heading the columns, known before the data (each a short phrase; wraps). */
	columns: readonly string[];
	/** The fact slots. */
	row: FactSlots<T>;
};

// A painted fact: a filler for its label (a chip's box and a status's painted
// mark beside it when `row` declares them) and one under each column, the
// facts' slots not run: their shape is the declaration's.
function PaintedFact<T>(props: {
	row: FactSlots<T>;
	columns: readonly string[];
	at: number;
}) {
	const { row, columns, at } = props;
	return (
		<div inert className={cn(COMPARISON_ROW, ROW)}>
			<span className={cn(COMPARISON_LABEL, LABEL)}>
				<span
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						LABEL_TEXT,
					)}
				>
					<Painted role="name" at={at} />
				</span>
				{row.chips ? (
					<span className={MARK}>
						<ChipBase family="neutral" label="" painted />
					</span>
				) : null}
				{row.status ? (
					<span className={MARK}>
						<StatusBase painted />
					</span>
				) : null}
			</span>
			{columns.map((column, index) => (
				<span
					key={column}
					className={cn(text({ role: "body" }), FIGURES, COLUMN)}
				>
					<Painted role="phrase" at={at + index} />
				</span>
			))}
		</div>
	);
}

// A loaded fact: its label (its chips and its verdict beside it) and its
// value under each column. It runs its slots itself, so a refetch that changes
// one item renders that fact alone. `index` counts the head row as the first,
// so the row number the table reads aloud holds for the facts a window leaves
// unmounted.
function FactBase<T>(props: {
	item: T;
	index: number;
	row: FactSlots<T>;
	columns: readonly string[];
}) {
	const { item, index, row, columns } = props;
	const values = row.values(item);
	const chips = row.chips?.(item) ?? [];
	const status = row.status?.(item);
	return (
		// biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold
		// biome-ignore lint/a11y/useFocusableInteractive: a read row
		<div
			role="row"
			aria-rowindex={index + 1}
			className={cn(COMPARISON_ROW, ROW)}
		>
			{/* biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold */}
			{/* biome-ignore lint/a11y/useFocusableInteractive: a read header */}
			<span role="rowheader" className={cn(COMPARISON_LABEL, LABEL)}>
				<span
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						LABEL_TEXT,
					)}
				>
					{row.label(item)}
				</span>
				{chips.map((chip) => (
					<span key={chip} className={MARK}>
						<Chip family="neutral" label={chip} />
					</span>
				))}
				{status ? (
					<span className={MARK}>
						<Status state={status.state} label={status.label} />
					</span>
				) : null}
			</span>
			{columns.map((column, index) => (
				// biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold
				<span
					key={column}
					role="cell"
					className={cn(text({ role: "body" }), FIGURES, COLUMN)}
				>
					{values[index]}
				</span>
			))}
		</div>
	);
}

const Fact = memo(FactBase) as typeof FactBase;

// The head row: the corner over the labels, then the columns.
const Head = memo(function Head(props: { columns: readonly string[] }) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold
		// biome-ignore lint/a11y/useFocusableInteractive: a read row
		<div role="row" aria-rowindex={1} className={cn(COMPARISON_ROW, ROW)}>
			{/* biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold */}
			<span role="cell" className={CORNER} />
			{props.columns.map((column) => (
				// biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold
				// biome-ignore lint/a11y/useFocusableInteractive: a read header
				<span
					key={column}
					role="columnheader"
					className={cn(
						text({ role: "meta" }),
						textStrong({ role: "meta" }),
						COLUMN,
					)}
				>
					{column}
				</span>
			))}
		</div>
	);
});

/** A Group of its own rows: a head row of `columns` at meta 500, then each fact's label at body 500 (its chips beside it, then its `status` verdict, a Status read out in the row, a passing fact drawing none) and its values in equal columns, a wrapped value keeping its row's air. On touch the label stands on its own line over the values, the verdict on that line. No column is the accent's; nothing is a selection. While the `items` selection's read waits, the head (the declared columns) stands over `PAINT_ROWS` painted facts: a filler for the label and each column, a chip's box when `row` declares chips and a painted verdict when it declares `status`, inert. From `VIRTUAL_FROM` facts under a scroller it draws only the facts near the scroller's view, behind the head, which stays mounted. The comparison is a frame of its facts: it draws the failed form with Retry, the missing form and the empty form in its own box with the generic sentence, and the stale and paused line above its head while it holds its read, whatever stands above it. */
export function Comparison<T>(props: ComparisonProps<T>) {
	const { drawn, frame } = useCollection(props.items);
	const { painted } = drawn;
	const { columns, row } = props;
	const box = useRef<HTMLDivElement>(null);
	const items = painted ? [] : drawn.value;
	// The head is the first row of the card; a long table windows its facts
	// behind it, and the head stays mounted.
	const count = (painted ? PAINT_ROWS : items.length) + 1;
	const keyOf = (index: number) =>
		index === 0
			? "head"
			: painted
				? `waiting-${index - 1}`
				: row.key(items[index - 1] as T);
	const rowAt = (index: number) => {
		if (index === 0) return <Head key="head" columns={columns} />;
		if (painted)
			return (
				<PaintedFact
					key={keyOf(index)}
					row={row}
					columns={columns}
					at={index - 1}
				/>
			);
		return (
			<Fact
				key={keyOf(index)}
				item={items[index - 1] as T}
				index={index}
				row={row}
				columns={columns}
			/>
		);
	};
	// The Group's card holds the rows, so the table's roles stand on its
	// own boxes; none is focusable, the facts are read, never acted on.
	return (
		<FrameBody frame={frame} fit="frame">
			<FrameLine frame={frame} />
			{/* biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold */}
			<div role="table" aria-label={props.label} aria-rowcount={count}>
				<GroupCard box={box}>
					<Window count={count} keyOf={keyOf} row={rowAt} box={box} keep={0} />
				</GroupCard>
			</div>
		</FrameBody>
	);
}
