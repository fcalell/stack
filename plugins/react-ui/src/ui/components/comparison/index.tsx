import { cn } from "@fcalell/ui-core/cn";
import {
	type FactShape,
	factShape,
	listBusy,
	listState,
	listWaits,
	retryOf,
} from "@fcalell/ui-core/list-state";
import {
	COMPARISON_LABEL,
	COMPARISON_ROW,
	lineBox,
	skeleton,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { useSectionWait } from "../../lib/section.ts";
import { useWords } from "../../lib/words.tsx";
import { Chip } from "../chip/index.tsx";
import { EmptyStateBase } from "../empty-state/base.tsx";
import { Group } from "../group/index.tsx";
import type { ListSource } from "../list/index.tsx";

const ROW = "flex items-baseline flex-wrap";
const ROW_WAIT = "flex items-center flex-wrap";
// The head's cell over the labels; on touch the label stands on its own line
// over the values, so the corner leaves the layout, kept for assistive tech
// as the head row's first cell.
const CORNER = "basis-0 grow min-w-0 touch:sr-only";
// A word wider than its column hyphenates in the document's language before
// it breaks; a wrapped value leaves no lone word on its last line.
const COLUMN = "basis-0 grow min-w-0 wrap-break-word hyphens-auto text-pretty";
const LABEL =
	"flex flex-wrap basis-0 grow min-w-0 items-center touch:basis-full";
const LABEL_TEXT = "min-w-0 wrap-break-word";
// A chip keeps its width beside a label that wraps.
const CHIP = "inline-flex shrink-0";
const CELL_WAIT = "flex items-center h-lh basis-0 grow min-w-0";
const LABEL_WAIT = "flex items-center basis-0 grow min-w-0 touch:basis-full";
const LINE_HEIGHT = "h-lh";
// A chip stands taller than the label's line.
const CHIP_LINE = "min-h-chip";
// The waiting facts: four rows of a label's bar, a chips bar when chips are
// declared, and each column's bar, at the lengths of the words they stand in
// for.
const LABEL_BARS = ["w-1/2", "w-1/3", "w-2/3", "w-1/2"] as const;
const VALUE_BARS = ["w-1/3", "w-2/3", "w-1/2"] as const;
const CHIP_BAR = "w-1/5";

/** One function per fact slot, each called with a loaded item; the slots given are the shape the waiting facts draw. */
export interface FactSlots<T> {
	/** The item's React key, unique in the comparison. */
	key: (item: T) => string;
	/** The fact's label. */
	label: (item: T) => string;
	/** The fact's value under each column, in the columns' order. */
	values: (item: T) => readonly string[];
	/** The chips beside the fact's label. */
	chips?: (item: T) => readonly string[] | undefined;
}

/** Facts set side by side across two or three columns, from a query or from items. */
export type ComparisonProps<T = unknown> = Closed &
	ListSource<T> & {
		/** What the columns compare, the table's accessible name. */
		label: string;
		/** The compared things' labels, heading the columns, known before the data. */
		columns: readonly string[];
		/** The fact slots. */
		row: FactSlots<T>;
	};

// A waiting fact: a label's bar (a chips bar beside it when chips are
// declared) and a bar per declared column.
function FactWait(props: { shape: FactShape; index: number }) {
	const { shape, index } = props;
	return (
		<div aria-hidden className={cn(COMPARISON_ROW, ROW_WAIT)}>
			<span
				className={cn(
					COMPARISON_LABEL,
					lineBox({ role: "body" }),
					LABEL_WAIT,
					shape.chips ? CHIP_LINE : LINE_HEIGHT,
				)}
			>
				<span
					className={cn(
						skeleton({ kind: "line" }),
						LABEL_BARS[index % LABEL_BARS.length],
					)}
				/>
				{shape.chips ? (
					<span className={cn(skeleton({ kind: "line" }), CHIP_BAR)} />
				) : null}
			</span>
			{Array.from({ length: shape.values }, (_, column) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: the columns are fixed stand-ins
					key={column}
					className={cn(lineBox({ role: "body" }), CELL_WAIT)}
				>
					<span
						className={cn(
							skeleton({ kind: "line" }),
							VALUE_BARS[(index + column) % VALUE_BARS.length],
						)}
					/>
				</span>
			))}
		</div>
	);
}

// A loaded fact: its label (its chips beside it) and its value under each
// column.
function Fact<T>(props: {
	item: T;
	row: FactSlots<T>;
	columns: readonly string[];
}) {
	const { item, row, columns } = props;
	const values = row.values(item);
	const chips = row.chips?.(item) ?? [];
	return (
		// biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold
		// biome-ignore lint/a11y/useFocusableInteractive: a read row
		<div role="row" className={cn(COMPARISON_ROW, ROW)}>
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
					<span key={chip} className={CHIP}>
						<Chip family="neutral" label={chip} />
					</span>
				))}
			</span>
			{columns.map((column, index) => (
				// biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold
				<span
					key={column}
					role="cell"
					className={cn(text({ role: "body" }), COLUMN)}
				>
					{values[index]}
				</span>
			))}
		</div>
	);
}

/** A Group of its own rows: a head row of `columns` at meta 500, then each fact's label at body 500 (its chips beside it) and its values in equal columns, a wrapped value keeping its row's air. On touch the label stands on its own line over the values. No column is the accent's; nothing is a selection. It draws its collection's four states: while its query is pending, `loading` is set or a loading Section around it waits, the head stands over four waiting facts, each a bar per column and a chips bar when `row` declares chips; a failed query draws the failed EmptyState with `sentence` and Retry; no item draws `empty`; then one row per fact. */
export function Comparison<T>(props: ComparisonProps<T>) {
	const words = useWords();
	const base = {
		query: props.query,
		items: props.items,
		loading: props.loading,
		sectionLoading: use(LoadingContext),
		inSection: false,
		hasEmpty: props.empty !== undefined,
	};
	const input = { ...base, inSection: useSectionWait(listWaits(base)) };
	const state = listState(input);
	const { columns, row } = props;
	if (state === "failed" && props.query !== undefined) {
		return (
			<EmptyStateBase
				tone="failed"
				sentence={props.sentence}
				act={{ label: words.retry, onAct: retryOf(props.query) }}
			/>
		);
	}
	if (state === "empty" && props.empty)
		return <EmptyStateBase tone="rest" {...props.empty} />;
	const items = (props.query ? props.query.data : props.items) ?? [];
	if (state === "loaded" && items.length === 0) return null;
	const shape = factShape(columns, row);
	const facts: ReactNode =
		state === "pending"
			? LABEL_BARS.map((width, index) => (
					<FactWait key={width + String(index)} shape={shape} index={index} />
				))
			: items.map((item) => (
					<Fact key={row.key(item)} item={item} row={row} columns={columns} />
				));
	// The Group's card holds the rows, so the table's roles stand on its
	// own boxes; none is focusable, the facts are read, never acted on.
	return (
		// biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold
		<div
			role="table"
			aria-label={props.label}
			aria-busy={listBusy(input) || undefined}
		>
			<Group loading={false}>
				{/* biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold */}
				{/* biome-ignore lint/a11y/useFocusableInteractive: a read row */}
				<div role="row" className={cn(COMPARISON_ROW, ROW)}>
					{/* biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold */}
					<span role="cell" className={CORNER} />
					{columns.map((column) => (
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
				{facts}
			</Group>
		</div>
	);
}
