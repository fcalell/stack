import {
	type FactShape,
	factShape,
	listBusy,
	listState,
	retryOf,
} from "@fcalell/ui-core/list-state";
import {
	COMPARISON_LABEL,
	COMPARISON_ROW,
	lineBox,
	skeleton,
	skeletonLane,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LoadingContext } from "../../lib/loading";
import { SectionContext } from "../../lib/section";
import { useWords } from "../../lib/words";
import { Chip } from "../chip";
import { EmptyStateBase } from "../empty-state/base";
import { Missing } from "../empty-state/missing";
import { Group } from "../group";
import type { ListSource } from "../list";

const ROW = "flex-row flex-wrap items-baseline";
const ROW_WAIT = "flex-row flex-wrap items-center";
const COLUMN = "flex-1 min-w-0";
// The label stands on its own line over the values, beside its chips.
const LABEL = "flex-row flex-wrap items-center w-full min-w-0";
const LABEL_TEXT = "min-w-0";
// A chip keeps its width beside a label that wraps.
const CHIP = "shrink-0";
// A line of a role: a zero-width strut sets its height, the bar centred on
// it.
const CELL_WAIT = "flex-1 flex-row items-center min-w-0";
const LABEL_WAIT = "flex-row items-center w-full min-w-0";
const BAR_ROOM = "flex-1 flex-row items-center min-w-0";
// A chip stands taller than the label's line.
const CHIP_LINE = "min-h-chip";
const STRUT = "​";
// The waiting facts: four rows of a label's bar (a chip's bar beside it when
// chips are declared) and each column's bar, every bar a share of the
// short-label lane of the line it stands in, so it stands at the length of a
// typical label or value rather than of the column.
const LABEL_BARS = ["w-1/2", "w-1/3", "w-2/3", "w-1/2"] as const;
const VALUE_BARS = ["w-1/3", "w-2/3", "w-1/2"] as const;
const CHIP_BAR = "w-1/4";

// One function per fact slot, each called with a loaded item; the slots
// given are the shape the waiting facts draw.
export interface FactSlots<T> {
	// The item's React key, unique in the comparison.
	key: (item: T) => string;
	// The fact's label.
	label: (item: T) => string;
	// The fact's value under each column, in the columns' order.
	values: (item: T) => readonly string[];
	// The chips beside the fact's label.
	chips?: (item: T) => readonly string[] | undefined;
}

export type ComparisonProps<T = unknown> = Closed &
	ListSource<T> & {
		// What the columns compare, the name of its rows.
		label: string;
		// The compared things' labels, heading the columns, known before the
		// data.
		columns: readonly string[];
		// The fact slots.
		row: FactSlots<T>;
	};

// A waiting fact: a label's bar (a chips bar beside it when chips are
// declared) on its own line, over a bar per declared column.
function FactWait(props: { shape: FactShape; index: number }) {
	const { shape, index } = props;
	return (
		<View className={cn(COMPARISON_ROW, ROW_WAIT)}>
			<View className={cn(LABEL_WAIT, shape.chips && CHIP_LINE)}>
				<RNText className={lineBox({ role: "body" })}>{STRUT}</RNText>
				<View
					className={cn(
						skeletonLane({ role: "body" }),
						COMPARISON_LABEL,
						BAR_ROOM,
					)}
				>
					<View
						className={cn(
							skeleton({ kind: "line" }),
							LABEL_BARS[index % LABEL_BARS.length],
						)}
					/>
					{shape.chips ? (
						<View className={cn(skeleton({ kind: "line" }), CHIP_BAR)} />
					) : null}
				</View>
			</View>
			{Array.from({ length: shape.values }, (_, column) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: the columns are fixed stand-ins
				<View key={column} className={CELL_WAIT}>
					<RNText className={lineBox({ role: "body" })}>{STRUT}</RNText>
					<View className={cn(skeletonLane({ role: "body" }), BAR_ROOM)}>
						<View
							className={cn(
								skeleton({ kind: "line" }),
								VALUE_BARS[(index + column) % VALUE_BARS.length],
							)}
						/>
					</View>
				</View>
			))}
		</View>
	);
}

// A loaded fact, said whole (its label, its chips, each value after its
// column's label): its label (its chips beside it) on its own line over its
// value under each column.
function Fact<T>(props: {
	item: T;
	row: FactSlots<T>;
	columns: readonly string[];
}) {
	const { item, row, columns } = props;
	const label = row.label(item);
	const values = row.values(item);
	const chips = row.chips?.(item) ?? [];
	const spoken = [
		label,
		...chips,
		...columns.map((column, index) => `${column}, ${values[index]}`),
	].join(", ");
	return (
		<View
			accessible
			accessibilityLabel={spoken}
			className={cn(COMPARISON_ROW, ROW)}
		>
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
					<View key={chip} className={CHIP}>
						<Chip family="neutral" label={chip} />
					</View>
				))}
			</View>
			{columns.map((column, index) => (
				<RNText key={column} className={cn(text({ role: "body" }), COLUMN)}>
					{values[index]}
				</RNText>
			))}
		</View>
	);
}

// A Group of its own rows: a head row of `columns` at meta 500, then each
// fact's label at body 500 (its chips beside it) on its own line over its
// values in equal columns, the phone's form. No column is the accent's;
// nothing is a selection. The phone has no table, so each row says its fact
// whole and the head, which the rows repeat, is drawn alone. It draws its
// collection's four states: while its query is pending, `loading` is set or
// a loading Section around it waits, the head stands over four waiting
// facts, each a bar per column and a chips bar when `row` declares chips; a
// query that answers not found draws the rest EmptyState saying it no longer
// exists with Back, never Retry; a failed query draws the failed EmptyState
// with `sentence` and Retry; no item draws `empty`; then one row per fact.
export function Comparison<T>(props: ComparisonProps<T>) {
	const words = useWords();
	const base = {
		query: props.query,
		items: props.items,
		loading: props.loading,
		sectionLoading: useContext(LoadingContext),
		inSection: false,
		hasEmpty: props.empty !== undefined,
	};
	const input = { ...base, inSection: useContext(SectionContext) };
	const state = listState(input);
	const { columns, row } = props;
	if (state === "missing") return <Missing />;
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
	return (
		<View
			accessibilityRole="list"
			accessibilityLabel={props.label}
			accessibilityState={{ busy: listBusy(input) }}
		>
			<Group loading={false}>
				<View
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
					className={cn(COMPARISON_ROW, ROW)}
				>
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
				{facts}
			</Group>
		</View>
	);
}
