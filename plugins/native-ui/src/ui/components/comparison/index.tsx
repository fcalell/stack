import {
	type Datum,
	type Drawn,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { StatusMark } from "@fcalell/ui-core/descriptors";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import {
	COMPARISON_LABEL,
	COMPARISON_ROW,
	FIGURES,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { inertProps, Painted } from "../../lib/paint";
import { Chip } from "../chip";
import { ChipBase } from "../chip/base";
import { Group, type GroupItem } from "../group";
import { Status } from "../status";
import { StatusBase } from "../status/base";

const ROW = "flex-row flex-wrap items-baseline";
const COLUMN = "flex-1 min-w-0";
// The label stands on its own line over the values, beside its chips.
const LABEL = "flex-row flex-wrap items-center w-full min-w-0";
const LABEL_TEXT = "min-w-0";
// A chip or a verdict keeps its width beside a label that wraps.
const MARK = "shrink-0";

// One function per fact slot, each called with an item (over the placeholder
// while the facts paint); the slots given are the shape the painted facts
// draw.
export interface FactSlots<T> {
	// The item's React key, unique in the comparison.
	key: (item: T) => string;
	/** The fact's label (a short phrase; wraps). */
	label: (item: T) => string;
	/** The fact's value under each column, in the columns' order (each a short phrase; wraps). */
	values: (item: T) => readonly string[];
	/** The chips beside the fact's label (each a word; truncates past the short measure, 18 characters). */
	chips?: (item: T) => readonly string[] | undefined;
	// The fact's verdict, drawn after the label and its chips; a passing
	// fact returns undefined, or a done mark where the screen reads the pass
	// out.
	status?: (item: T) => StatusMark | undefined;
}

export type ComparisonProps<T = unknown> = Closed & {
	/** The items the facts draw: constants, or a selection, which paints `PAINT_ROWS` facts until its read lands. A selection stands in a frame (a Pane, Section, Sheet or Form given the read), which draws the comparison's failed, missing and empty forms. */
	items: Datum<readonly T[]>;
	/** What the columns compare, the name of its rows (a short phrase; read aloud, never drawn). */
	label: string;
	/** The compared things' labels, heading the columns, known before the data (each a short phrase; wraps). */
	columns: readonly string[];
	// The fact slots.
	row: FactSlots<T>;
};

// A painted fact: a filler for its label (a chip's box and a status's painted
// mark beside it when `row` declares them) on its own line, over one filler
// under each column; the facts' slots are not run: their shape is the
// declaration's.
function PaintedFact<T>(props: {
	row: FactSlots<T>;
	columns: readonly string[];
	at: number;
}) {
	const { row, columns, at } = props;
	return (
		<View {...inertProps(true)} className={cn(COMPARISON_ROW, ROW)}>
			<View className={cn(COMPARISON_LABEL, LABEL)}>
				<RNText
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						LABEL_TEXT,
					)}
				>
					<Painted role="name" at={at} />
				</RNText>
				{row.chips ? (
					<View className={MARK}>
						<ChipBase family="neutral" label="" painted />
					</View>
				) : null}
				{row.status ? (
					<View className={MARK}>
						<StatusBase painted />
					</View>
				) : null}
			</View>
			{columns.map((column, index) => (
				<RNText
					key={column}
					className={cn(text({ role: "body" }), FIGURES, COLUMN)}
				>
					<Painted role="phrase" at={at + index} />
				</RNText>
			))}
		</View>
	);
}

// A loaded fact: its label (its chips and its verdict beside it) on its own
// line over its value under each column.
function Fact<T>(props: {
	item: T;
	row: FactSlots<T>;
	columns: readonly string[];
}) {
	const { item, row, columns } = props;
	const label = row.label(item);
	const values = row.values(item);
	const chips = row.chips?.(item) ?? [];
	const status = row.status?.(item);
	return (
		<View className={cn(COMPARISON_ROW, ROW)}>
			<View className={cn(COMPARISON_LABEL, LABEL)}>
				<RNText
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						LABEL_TEXT,
					)}
				>
					{label}
				</RNText>
				{chips.map((chip) => (
					<View key={chip} className={MARK}>
						<Chip family="neutral" label={chip} />
					</View>
				))}
				{status ? (
					<View className={MARK}>
						<Status state={status.state} label={status.label} />
					</View>
				) : null}
			</View>
			{columns.map((column, index) => (
				<RNText
					key={column}
					className={cn(text({ role: "body" }), FIGURES, COLUMN)}
				>
					{values[index]}
				</RNText>
			))}
		</View>
	);
}

// A Group of its own rows: a head row of `columns` at meta 500, then each
// fact's label at body 500 (its chips beside it, then its `status` verdict, a
// passing fact drawing none) on its own line over its values in equal
// columns, the phone's form. No column is the accent's; nothing is a
// selection. The phone has no table, so the head, which the rows repeat, is
// drawn alone. While the `items` selection's read waits, the head (the
// declared columns) stands over `PAINT_ROWS` painted facts: a filler for the
// label and each column, a chip's box when `row` declares chips and a painted
// verdict when it declares `status`, inert. The frame around it draws the
// rest: the failed form with Retry, the missing form, the empty form.
export function Comparison<T>(props: ComparisonProps<T>) {
	const [drawn] = useSelections([props.items] as const);
	const { painted } = drawn as Drawn<readonly T[]>;
	const { columns, row } = props;
	const facts: GroupItem[] = painted
		? Array.from({ length: PAINT_ROWS }, (_, at) => ({
				key: `waiting-${at}`,
				row: <PaintedFact row={row} columns={columns} at={at} />,
			}))
		: (drawn.value as readonly T[]).map((item) => ({
				key: row.key(item),
				row: <Fact item={item} row={row} columns={columns} />,
			}));
	const header = (
		<View className={cn(COMPARISON_ROW, ROW)}>
			{columns.map((column) => (
				<RNText
					key={column}
					className={cn(
						text({ role: "meta" }),
						textStrong({ role: "meta" }),
						COLUMN,
					)}
				>
					{column}
				</RNText>
			))}
		</View>
	);
	return <Group items={[{ key: "head", row: header }, ...facts]} />;
}
