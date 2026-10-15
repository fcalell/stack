import { placeholderData } from "@fcalell/plugin-api/read";
import type { Drawn, Read } from "@fcalell/plugin-api/tanstack-query";
import { toggled, treeRows } from "@fcalell/ui-core/list-state";
import { PAINT_ROWS, painting } from "@fcalell/ui-core/paint";
import {
	LIST,
	LIST_DIVIDED,
	LIST_ITEM,
	LIST_TREE,
} from "@fcalell/ui-core/variants";
import { type ReactElement, useCallback, useState } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { between } from "../../lib/group";
import { MoreRow } from "../../lib/more";
import { DefinitionItem } from "../definition-row";
import { FileItem } from "../file-row";
import { hasMore, ListRowItem } from "../list-row/base";
import { MeterItem } from "../meter";
import type { ListKind } from "./index";

/** What a `Group` hands the List it frames; no app sets it, so it is outside `ListProps`. */
export interface ListInternal<T> {
	// The List stands on a Group's card: no bleed and no box of its own, its
	// rows the card's, the card's hairline once between rows.
	framed?: boolean;
	// The items as the List (or the Group framing it) subscribed to them: real,
	// or the placeholder while the read waits, which paints `PAINT_ROWS` rows.
	drawn: Drawn<readonly T[]>;
	// The pages read the items come from, when it has pages: the List ends in
	// its more row.
	more?: Read<unknown>;
	// The List is the painted next page of another: its rows alone, standing in
	// that List's box.
	tail?: boolean;
}

// The List every List and a Group's `list` draw. Outside the package's
// exports: `framed` and `drawn` are the List's and the Group's alone.
export function ListBase<T, V extends string | null = string>(
	props: Closed & ListKind<T, V> & ListInternal<T>,
) {
	// The keys of the tree's folded branches; every branch starts open.
	const [folded, setFolded] = useState<readonly string[]>([]);
	const fold = useCallback(
		(key: string) => setFolded((keys) => toggled(keys, key)),
		[],
	);
	const { drawn } = props;
	const painted = drawn.painted;
	// Painted, `PAINT_ROWS` rows each over the placeholder; the data's depths
	// are not there, so a painted tree draws flat.
	const items: readonly T[] = drawn.painted
		? Array.from({ length: PAINT_ROWS }, () => drawn.value as T)
		: drawn.value;
	const children = painted ? undefined : props.row?.children;
	const framed = props.framed === true;
	// A painted row's key is its place, the slots' keys being the placeholder's.
	const keyAt = (key: (item: T) => string, index: number) =>
		painted ? `waiting-${index}` : key(items[index] as T);
	// On a Group's card (framed) the card is the rows' box: each row after the
	// first draws the group's hairline above it. Two-line rows (a map with a `meta`) abut
	// under the same hairline.
	// A tree's rows abut, so its rails run unbroken.
	const divided = props.row?.meta !== undefined && children === undefined;
	// Whether a row of the loaded list has a more act: the rows without one then
	// keep its square, so every row's end stands at one x.
	let room = false;
	const hairlined = framed || divided;
	const lines = (rows: readonly ReactElement[]) =>
		rows.map((row, index) => (
			<View key={row.key ?? index} className={between(index)}>
				{row}
			</View>
		));
	// The more row ends the box, behind the hairline a further row would have;
	// the rows it paints stand in its place at the box's rhythm.
	const more =
		props.more && !painted && !props.tail ? (
			<MoreRow
				read={props.more}
				empty={items.length === 0}
				inset
				paint={() => (
					<ListBase
						{...props}
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
		) : null;
	const frame = (rows: readonly ReactElement[], tree = false) => {
		if (props.tail) return hairlined ? lines(rows) : rows;
		if (!hairlined)
			return (
				<View className={tree ? LIST_TREE : LIST}>
					{rows}
					{more}
				</View>
			);
		const all = more
			? [
					...lines(rows),
					<View key="more" className={between(rows.length)}>
						{more}
					</View>,
				]
			: lines(rows);
		return framed ? all : <View className={LIST_DIVIDED}>{all}</View>;
	};
	if (props.row) {
		const { row } = props;
		const { more } = row;
		if (more !== undefined) {
			const every =
				children === undefined
					? items
					: treeRows(items, { key: row.key, children }, []).map(
							(each) => each.item,
						);
			room = every.some((item) =>
				hasMore(
					painted
						? (painting(more, item) as ReturnType<typeof more>)
						: more(item),
				),
			);
		}
		if (children === undefined)
			return frame(
				items.map((item, index) => (
					<ListRowItem
						key={keyAt(row.key, index)}
						item={item}
						index={index}
						row={row}
						painted={painted}
						room={room}
					/>
				)),
			);
		// Each row of the tree is given its depth and fold.
		return frame(
			treeRows(items, { key: row.key, children }, folded).map((each, index) => (
				<ListRowItem
					key={each.key}
					item={each.item}
					index={index}
					row={row}
					painted={painted}
					room={room}
					fold={fold}
					depth={each.depth}
					open={each.branch ? each.open : undefined}
				/>
			)),
			true,
		);
	}
	if (props.meter) {
		const { meter } = props;
		return frame(
			items.map((item, index) => (
				<View key={keyAt(meter.key, index)} className={LIST_ITEM}>
					<MeterItem
						item={item}
						index={index}
						meter={meter}
						painted={painted}
					/>
				</View>
			)),
		);
	}
	if (props.definition) {
		const { definition } = props;
		return frame(
			items.map((item, index) => (
				<DefinitionItem
					key={keyAt(definition.key, index)}
					item={item}
					index={index}
					definition={definition}
					painted={painted}
				/>
			)),
		);
	}
	const { file } = props;
	return frame(
		items.map((item, index) => (
			<FileItem
				key={keyAt(file.key, index)}
				item={item}
				index={index}
				file={file}
				painted={painted}
			/>
		)),
	);
}
