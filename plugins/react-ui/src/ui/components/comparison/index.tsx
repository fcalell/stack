import { cn } from "@fcalell/ui-core/cn";
import type { ComparisonRow } from "@fcalell/ui-core/descriptors";
import {
	COMPARISON_LABEL,
	COMPARISON_ROW,
	lineBox,
	skeleton,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { Chip } from "../chip/index.tsx";
import { Group } from "../group/index.tsx";

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
const LABEL_WAIT =
	"flex items-center h-lh basis-0 grow min-w-0 touch:basis-full";
// The loading form: the head's bars over two columns, then four rows of a
// label's bar and each column's, at the lengths of the words they stand in for.
const HEAD_BAR = "w-1/3";
const COLUMNS_WAIT = ["first", "second"] as const;
const BARS = [
	["w-1/2", "w-1/3", "w-2/3"],
	["w-1/3", "w-2/3", "w-1/2"],
	["w-2/3", "w-1/2", "w-1/2"],
	["w-1/2", "w-1/2", "w-1/3"],
] as const;

/** Facts set side by side across two or three cells. */
export interface ComparisonProps extends Closed {
	/** What the cells compare, the table's accessible name. */
	label: string;
	/** One row per compared fact: its label, its chips, and a value per cell; the first row's cell labels head the columns. */
	rows: readonly ComparisonRow[];
	/** The rows wait (a loading Section's body waits with it): the head's bars and four rows of bars stand in for them. */
	loading?: boolean;
}

/** A Group of its own rows: a head row of the cells' labels at meta 500, then each fact's label at body 500 (its chips beside it) and its values in equal columns, a wrapped value keeping its row's air. On touch the label stands on its own line over the values. No column is the accent's; nothing is a selection. */
export function Comparison({ label, rows, loading }: ComparisonProps) {
	const inherited = use(LoadingContext);
	const waiting = loading ?? inherited;
	const labels = rows[0]?.cells.map((cell) => cell.label) ?? [];
	if (waiting)
		return (
			// A loading Section is busy once: rows drawn on its word say nothing.
			<div aria-busy={loading || undefined}>
				<Group loading={false}>
					<div className={cn(COMPARISON_ROW, ROW_WAIT)}>
						<span className={CORNER} />
						{COLUMNS_WAIT.map((column) => (
							<span
								key={column}
								className={cn(lineBox({ role: "meta" }), CELL_WAIT)}
							>
								<span className={cn(skeleton({ kind: "line" }), HEAD_BAR)} />
							</span>
						))}
					</div>
					{BARS.map(([label, ...values], index) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: the rows are fixed stand-ins
							key={index}
							className={cn(COMPARISON_ROW, ROW_WAIT)}
						>
							<span className={cn(lineBox({ role: "body" }), LABEL_WAIT)}>
								<span className={cn(skeleton({ kind: "line" }), label)} />
							</span>
							{values.map((width, column) => (
								<span
									// biome-ignore lint/suspicious/noArrayIndexKey: the columns are fixed stand-ins
									key={column}
									className={cn(lineBox({ role: "body" }), CELL_WAIT)}
								>
									<span className={cn(skeleton({ kind: "line" }), width)} />
								</span>
							))}
						</div>
					))}
				</Group>
			</div>
		);
	// The Group's card holds the rows, so the table's roles stand on its
	// own boxes; none is focusable, the facts are read, never acted on.
	return (
		// biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold
		<div role="table" aria-label={label}>
			<Group loading={false}>
				{/* biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold */}
				{/* biome-ignore lint/a11y/useFocusableInteractive: a read row */}
				<div role="row" className={cn(COMPARISON_ROW, ROW)}>
					{/* biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold */}
					<span role="cell" className={CORNER} />
					{labels.map((label) => (
						// biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold
						// biome-ignore lint/a11y/useFocusableInteractive: a read header
						<span
							key={label}
							role="columnheader"
							className={cn(
								text({ role: "meta" }),
								textStrong({ role: "meta" }),
								COLUMN,
							)}
						>
							{label}
						</span>
					))}
				</div>
				{rows.map((row) => (
					// biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold
					// biome-ignore lint/a11y/useFocusableInteractive: a read row
					<div key={row.label} role="row" className={cn(COMPARISON_ROW, ROW)}>
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
								{row.label}
							</span>
							{row.chips?.map((chip) => (
								<span key={chip.label} className={CHIP}>
									<Chip family="neutral" label={chip.label} />
								</span>
							))}
						</span>
						{row.cells.map((cell) => (
							// biome-ignore lint/a11y/useSemanticElements: a Group's rows, which no native table element can hold
							<span
								key={cell.label}
								role="cell"
								className={cn(text({ role: "body" }), COLUMN)}
							>
								{cell.value}
							</span>
						))}
					</div>
				))}
			</Group>
		</div>
	);
}
