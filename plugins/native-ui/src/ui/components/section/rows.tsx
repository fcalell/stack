import { placeholderData } from "@fcalell/plugin-api/read";
import type { Drawn, Read } from "@fcalell/plugin-api/tanstack-query";
import { toggled, treeRows } from "@fcalell/ui-core/list-state";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import { HAIRLINE } from "@fcalell/ui-core/variants";
import { type ReactElement, useCallback, useState } from "react";
import { View } from "react-native";
import { useArrivals } from "../../lib/arrive";
import { cn } from "../../lib/cn";
import { between } from "../../lib/group";
import { MoreRow } from "../../lib/more";
import { FileRowItem } from "../file-row";
import { RowItem as RowView } from "../row";
import { BandHead } from "./band";
import type { Band, Row, RowItem } from "./index";

/** What the Section hands its rows; no app sets it, so it is outside `SectionProps`. */
export interface RowsInternal {
	/** The items as the Section subscribed to them: real, or the placeholder while the read waits, which paints `PAINT_ROWS` rows. */
	drawn: Drawn<readonly Row[]>;
	/** The pages read the items come from, when it has pages: the sheet ends in its more row. */
	more?: Read<unknown>;
	/** The rows are the painted next page of another sheet: its rows alone, standing in that sheet's card. */
	tail?: boolean;
	/** The Section's `groups`. */
	groups?: readonly Band[];
	/** The Section's head counts the rows, so a lone band holding every row draws no count of its own: one band, one count. */
	counted?: boolean;
	/** The row item the painted rows take their shape from; a title line over a meta line when none is given. */
	paint?: RowItem;
}

// The painted row: every painted row is a title line over a meta line, whatever
// kind the loaded rows are.
const PAINTED: RowItem = { key: "", title: "", meta: [""] };

const isRow = (item: Row): item is RowItem => !("path" in item);
const childrenOf = (item: Row) => (isRow(item) ? item.children : undefined);

// The key of a row: its own, the label's text, the title's.
function keyOf(row: Row): string {
	if (row.key !== undefined) return row.key;
	if ("path" in row) return "";
	if (typeof row.label === "string") return row.label;
	if (row.label) return row.label.code;
	return typeof row.title === "string" ? row.title : "";
}

// One entry of the sheet: a row, or a band over the rows after it.
interface Entry {
	key: string;
	node: ReactElement;
	band?: boolean;
	/** A tree's child: its depth, where the hairline above it starts. */
	depth?: number;
}

// The hairline above a tree's child starts at its rail: past the row's inset
// and one indent per level, so the indent before the rail reads as the
// parent's and is never ruled as an empty column. It stands over the entry's
// top, where `between` draws a root's.
const TREE_RULE = "absolute top-0 inset-x-0 flex-row ps-pad";
const TREE_RULE_LINE = "flex-1 border-t";

function RailRule(props: { depth: number }) {
	const levels = Array.from({ length: props.depth }, (_, level) => level);
	return (
		<View pointerEvents="none" className={TREE_RULE}>
			{levels.map((level) => (
				<View key={level} className="w-indent" />
			))}
			<View className={cn(TREE_RULE_LINE, HAIRLINE)} />
		</View>
	);
}

/** The rows of a Section's sheet, of whatever kinds, with its bands and its tree, on the sheet's card. Outside the package's exports: `drawn` is the Section's alone. */
export function Rows(props: RowsInternal) {
	// The keys of the tree's folded branches; every branch starts open.
	const [folded, setFolded] = useState<readonly string[]>([]);
	const fold = useCallback(
		(key: string) => setFolded((keys) => toggled(keys, key)),
		[],
	);
	const { drawn } = props;
	const painted = drawn.painted;
	// Painted, `PAINT_ROWS` painted row items; the data's depths are not there,
	// so a painted tree draws flat.
	const loaded: readonly Row[] = painted
		? Array.from({ length: PAINT_ROWS }, () => props.paint ?? PAINTED)
		: drawn.value;
	// The groups' bands stand over a loaded sheet. Rows of no group stand before
	// the first band, the rest in their group's order, each group's rows in the
	// items' order.
	const groups = painted ? undefined : props.groups;
	const rank = (item: Row) =>
		groups?.findIndex(
			(each) => each.key === (isRow(item) ? item.group : undefined),
		) ?? -1;
	const items: readonly Row[] = groups
		? [...loaded].sort((a, b) => rank(a) - rank(b))
		: loaded;
	// A sheet is a tree once any of its row items declares `children`.
	const tree = !painted && items.some((item) => childrenOf(item) !== undefined);
	// The rows that came on their own once the sheet was drawn fade in as they
	// mount; what it held when first drawn is not new.
	const arrived = useArrivals(painted ? [] : items.map(keyOf), !painted);
	// A painted row's key is its place, the painted rows sharing one item. Only
	// a painted row takes its place as a prop (it varies the filler): a loaded
	// row's place moves when a row lands above it, which would render every row
	// below.
	const visible = tree
		? treeRows(items, { key: keyOf, children: childrenOf }, folded)
		: items.map((item, index) => ({
				item,
				key: painted ? `waiting-${index}` : keyOf(item),
				depth: undefined,
				branch: false,
				open: false,
			}));
	const rows: Entry[] = visible.map((each, index) => {
		const { item, key } = each;
		if ("path" in item)
			return { key, node: <FileRowItem item={item} painted={painted} /> };
		return {
			key,
			depth: each.depth,
			node: (
				<RowView
					item={item}
					id={key}
					index={painted ? index : undefined}
					painted={painted}
					fold={fold}
					depth={each.depth}
					open={each.branch ? each.open : undefined}
					arrived={arrived.has(key)}
				/>
			),
		};
	});
	// With groups, the entries are the rows with a band before the first row of
	// each group (and every empty group's, after the last); a tree's child
	// stands with its parent.
	const entries: Entry[] = [];
	if (groups) {
		const counts = groups.map(() => 0);
		const rowsAt: { entry: Entry; group: number }[] = visible.map(
			(each, index) => ({
				entry: rows[index] as Entry,
				group: each.depth ? -1 : rank(each.item),
			}),
		);
		for (const { group } of rowsAt)
			if (group >= 0) counts[group] = (counts[group] as number) + 1;
		// One band holding every row would repeat the head's count: it draws none.
		const roots = visible.filter((each) => !each.depth).length;
		const lone =
			props.counted === true && groups.length === 1 && counts[0] === roots;
		const band = (at: number): Entry => {
			const each = groups[at] as Band;
			return {
				key: `band:${each.key}`,
				band: true,
				node: (
					<BandHead
						label={each.label}
						count={lone ? 0 : (counts[at] as number)}
						act={each.act}
					/>
				),
			};
		};
		let shown = 0;
		for (const { entry, group } of rowsAt) {
			for (; shown <= group; shown++) entries.push(band(shown));
			entries.push(entry);
		}
		for (; shown < groups.length; shown++) entries.push(band(shown));
	} else entries.push(...rows);
	// The card is the rows' box: each entry after the first draws the card's
	// hairline above it, but for the row a band closes with its own rule.
	const lines = entries.map((entry, index) => {
		const ruled = !entries[index - 1]?.band && index > 0;
		const child = ruled && entry.depth !== undefined && entry.depth > 0;
		return (
			<View key={entry.key} className={between(ruled && !child ? index : 0)}>
				{entry.node}
				{child ? <RailRule depth={entry.depth as number} /> : null}
			</View>
		);
	});
	if (props.tail) return lines;
	// The more row ends the card, behind the hairline a further row would have;
	// the rows it paints stand in its place at the card's rhythm.
	if (!props.more || painted) return lines;
	const sheet = props;
	return [
		...lines,
		<View key="more" className={between(entries.length)}>
			<MoreRow
				read={props.more}
				empty={items.length === 0}
				inset
				paint={() => (
					<Rows
						{...sheet}
						more={undefined}
						tail
						drawn={{
							painted: true,
							phase: "waiting",
							value: placeholderData(),
						}}
					/>
				)}
			/>
		</View>,
	];
}
