import { placeholderData } from "@fcalell/plugin-api/read";
import type { Drawn, Read } from "@fcalell/plugin-api/tanstack-query";
import type { RowLeading } from "@fcalell/ui-core/descriptors";
import { toggled, treeRows } from "@fcalell/ui-core/list-state";
import { PAINT_ROWS, painting } from "@fcalell/ui-core/paint";
import {
	LIST,
	LIST_DIVIDED,
	LIST_ITEM,
	LIST_TREE,
} from "@fcalell/ui-core/variants";
import { type ReactElement, useState } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { between } from "../../lib/group";
import { MoreRow } from "../../lib/more";
import { DefinitionRowBase } from "../definition-row";
import { FileRowBase } from "../file-row";
import { ListRowBase, type RowTree } from "../list-row/base";
import { MeterBase } from "../meter";
import type { LeadingSlot, ListKind } from "./index";

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

// The item's leading mark, of the kind the slot names.
function leadingOf<T>(slot: LeadingSlot<T>, item: T): RowLeading {
	if (slot.avatar !== undefined) return { avatar: slot.avatar(item) };
	if (slot.icon !== undefined) return { icon: slot.icon(item) };
	if (slot.check !== undefined) return { check: slot.check(item) };
	return { status: slot.status(item) };
}

// The List every List and a Group's `list` draw. Outside the package's
// exports: `framed` and `drawn` are the List's and the Group's alone.
export function ListBase<T, V extends string | null = string>(
	props: Closed & ListKind<T, V> & ListInternal<T>,
) {
	// The keys of the tree's folded branches; every branch starts open.
	const [folded, setFolded] = useState<readonly string[]>([]);
	const { drawn } = props;
	const painted = drawn.painted;
	// Painted, `PAINT_ROWS` rows each over the placeholder; the data's depths
	// are not there, so a painted tree draws flat.
	const items: readonly T[] = drawn.painted
		? Array.from({ length: PAINT_ROWS }, () => drawn.value as T)
		: drawn.value;
	const children = painted ? undefined : props.row?.children;
	const framed = props.framed === true;
	// A slot run over an item; over a painted one, a slot that throws on the
	// placeholder paints as the item itself.
	const slot = <R,>(fn: (item: T) => R, item: T): R =>
		painted ? (painting(fn, item) as R) : fn(item);
	// A painted row's key is its place, the slots' keys being the placeholder's.
	const keyOf = (key: (item: T) => string, item: T, index: number) =>
		painted ? `waiting-${index}` : key(item);
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
		const { leading } = row;
		// A painted row opens as the loaded one would: it draws the chevron, and
		// builds no hit.
		const opens = row.href !== undefined || row.onOpen !== undefined;
		const rowOf = (item: T, index: number, tree?: RowTree) => (
			<ListRowBase
				key={keyOf(row.key, item, index)}
				change={row.change && slot(row.change, item)}
				leading={leading && slot((one) => leadingOf(leading, one), item)}
				title={slot(row.title, item)}
				meta={row.meta && slot(row.meta, item)}
				trailing={row.trailing && slot(row.trailing, item)}
				status={row.status && slot(row.status, item)}
				warning={row.warning && slot(row.warning, item)}
				lock={row.lock && slot(row.lock, item)}
				chip={row.chip && slot(row.chip, item)}
				entry={row.entry && slot(row.entry, item)}
				steps={row.steps && slot(row.steps, item)}
				dim={row.dim && slot(row.dim, item)}
				wrap={row.wrap}
				act={row.act && slot(row.act, item)}
				more={row.more && slot(row.more, item)}
				href={row.href && slot(row.href, item)}
				selected={row.selected && slot(row.selected, item)}
				onOpen={row.onOpen ? () => row.onOpen?.(item) : undefined}
				room={room}
				tree={tree}
				painted={painted}
				opens={opens}
				at={index}
			/>
		);
		const { more } = row;
		if (more !== undefined) {
			const every =
				children === undefined
					? items
					: treeRows(items, { key: row.key, children }, []).map(
							(each) => each.item,
						);
			room = every.some((item) => slot(more, item)?.length);
		}
		if (children === undefined)
			return frame(items.map((item, index) => rowOf(item, index)));
		// Each row of the tree is given its depth and fold.
		return frame(
			treeRows(items, { key: row.key, children }, folded).map((each, index) =>
				rowOf(each.item, index, {
					depth: each.depth,
					fold: each.branch
						? {
								open: each.open,
								onToggle: () => setFolded((keys) => toggled(keys, each.key)),
							}
						: undefined,
				}),
			),
			true,
		);
	}
	if (props.meter) {
		const { meter } = props;
		return frame(
			items.map((item, index) => (
				<View key={keyOf(meter.key, item, index)} className={LIST_ITEM}>
					<MeterBase
						label={slot(meter.label, item)}
						value={slot(meter.value, item)}
						max={slot(meter.max, item)}
						mark={meter.mark && slot(meter.mark, item)}
						{...(meter.counts
							? { counts: slot(meter.counts, item) }
							: { meta: meter.meta && slot(meter.meta, item) })}
						painted={painted}
						at={index}
					/>
				</View>
			)),
		);
	}
	if (props.definition) {
		const { definition } = props;
		return frame(
			items.map((item, index) => {
				const locked = definition.locked && slot(definition.locked, item);
				const key = keyOf(definition.key, item, index);
				const shared = {
					change: definition.change && slot(definition.change, item),
					label: slot(definition.label, item),
					value: definition.value && slot(definition.value, item),
					copyable: definition.copyable,
					painted,
					at: index,
				};
				if (locked)
					return <DefinitionRowBase key={key} {...shared} locked={locked} />;
				return (
					<DefinitionRowBase
						key={key}
						{...shared}
						description={
							definition.description && slot(definition.description, item)
						}
						act={definition.act && slot(definition.act, item)}
						href={definition.href && slot(definition.href, item)}
						onOpen={
							definition.onOpen ? () => definition.onOpen?.(item) : undefined
						}
					/>
				);
			}),
		);
	}
	const { file } = props;
	return frame(
		items.map((item, index) => (
			<FileRowBase
				key={keyOf(file.key, item, index)}
				path={slot(file.path, item)}
				added={slot(file.added, item)}
				removed={slot(file.removed, item)}
				seen={file.seen && slot(file.seen, item)}
				change={file.change && slot(file.change, item)}
				chip={file.chip && slot(file.chip, item)}
				href={file.href && slot(file.href, item)}
				onOpen={file.onOpen ? () => file.onOpen?.(item) : undefined}
				painted={painted}
				at={index}
			/>
		)),
	);
}
