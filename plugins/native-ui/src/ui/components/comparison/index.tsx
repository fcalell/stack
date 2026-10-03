import type { ComparisonRow } from "@fcalell/ui-core/descriptors";
import {
	COMPARISON_LABEL,
	COMPARISON_ROW,
	lineBox,
	skeleton,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LoadingContext } from "../../lib/loading";
import { Chip } from "../chip";
import { Group } from "../group";

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
const STRUT = "​";
// The loading form: the head's bars over two columns, then four rows of a
// label's bar and each column's, at the lengths of the words they stand in
// for.
const HEAD_BAR = "w-1/3";
const COLUMNS_WAIT = ["first", "second"] as const;
const BARS = [
	["w-1/2", "w-1/3", "w-2/3"],
	["w-1/3", "w-2/3", "w-1/2"],
	["w-2/3", "w-1/2", "w-1/2"],
	["w-1/2", "w-1/2", "w-1/3"],
] as const;

export interface ComparisonProps extends Closed {
	// What the cells compare, the name of its rows.
	label: string;
	// One row per compared fact: its label, its chips, and a value per cell;
	// the first row's cell labels head the columns.
	rows: readonly ComparisonRow[];
	// The rows wait (a loading Section's body waits with it): the head's bars
	// and four rows of bars stand in for them.
	loading?: boolean;
}

// A Group of its own rows: a head row of the cells' labels at meta 500, then
// each fact's label at body 500 (its chips beside it) on its own line over
// its values in equal columns, the phone's form. No column is the accent's;
// nothing is a selection. The phone has no table, so each row says its fact
// whole (its label, its chips, each value after its column's label) and the
// head, which the rows repeat, is drawn alone.
export function Comparison({ label, rows, loading }: ComparisonProps) {
	const inherited = useContext(LoadingContext);
	const waiting = loading ?? inherited;
	const labels = rows[0]?.cells.map((cell) => cell.label) ?? [];
	if (waiting)
		return (
			// A loading Section is busy once: rows drawn on its word say nothing.
			<View accessibilityState={{ busy: loading === true }}>
				<Group loading={false}>
					<View className={cn(COMPARISON_ROW, ROW_WAIT)}>
						{COLUMNS_WAIT.map((column) => (
							<View key={column} className={CELL_WAIT}>
								<RNText className={lineBox({ role: "meta" })}>{STRUT}</RNText>
								<View className={cn(skeleton({ kind: "line" }), HEAD_BAR)} />
							</View>
						))}
					</View>
					{BARS.map(([name, ...values], index) => (
						<View
							// biome-ignore lint/suspicious/noArrayIndexKey: the rows are fixed stand-ins
							key={index}
							className={cn(COMPARISON_ROW, ROW_WAIT)}
						>
							<View className={LABEL_WAIT}>
								<RNText className={lineBox({ role: "body" })}>{STRUT}</RNText>
								<View className={cn(skeleton({ kind: "line" }), name)} />
							</View>
							{values.map((width, column) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: the columns are fixed stand-ins
								<View key={column} className={CELL_WAIT}>
									<RNText className={lineBox({ role: "body" })}>{STRUT}</RNText>
									<View className={cn(skeleton({ kind: "line" }), width)} />
								</View>
							))}
						</View>
					))}
				</Group>
			</View>
		);
	return (
		<View accessibilityRole="list" accessibilityLabel={label}>
			<Group loading={false}>
				<View
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
					className={cn(COMPARISON_ROW, ROW)}
				>
					{labels.map((column) => (
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
				{rows.map((row) => (
					<View
						key={row.label}
						accessible
						accessibilityLabel={[
							row.label,
							...(row.chips ?? []).map((chip) => chip.label),
							...row.cells.map((cell) => `${cell.label}, ${cell.value}`),
						].join(", ")}
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
								{row.label}
							</RNText>
							{row.chips?.map((chip) => (
								<View key={chip.label} className={CHIP}>
									<Chip family="neutral" label={chip.label} />
								</View>
							))}
						</View>
						{row.cells.map((cell) => (
							<RNText
								key={cell.label}
								className={cn(text({ role: "body" }), COLUMN)}
							>
								{cell.value}
							</RNText>
						))}
					</View>
				))}
			</Group>
		</View>
	);
}
