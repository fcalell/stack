import type { RowLeading } from "@fcalell/ui-core/descriptors";
import {
	definitionShape,
	fileShape,
	listState,
	meterShape,
	retryOf,
	rowShape,
	toggled,
	treeRows,
	WAITING_ROWS,
} from "@fcalell/ui-core/list-state";
import {
	LIST,
	LIST_DIVIDED,
	LIST_ITEM,
	LIST_TREE,
} from "@fcalell/ui-core/variants";
import { type ReactElement, useContext, useId, useState } from "react";
import { View } from "react-native";
import { EmptyBase } from "../../lib/empty";
import { between } from "../../lib/group";
import { LoadingContext } from "../../lib/loading";
import { useWords } from "../../lib/words";
import { DefinitionRow } from "../definition-row";
import { DefinitionWait } from "../definition-row/wait";
import { FileRow } from "../file-row";
import { FileWait } from "../file-row/wait";
import { ListRowBase, type RowTree } from "../list-row/base";
import { RowWait } from "../list-row/wait";
import { Meter } from "../meter";
import { MeterWait } from "../meter/wait";
import { MissingBase } from "../missing/base";
import type { LeadingSlot, ListProps } from "./index";

/** What a `Group` hands the List it frames; no app sets it, so it is outside `ListProps`. */
export interface ListInternal {
	// The List stands on a Group's card: no bleed and no box of its own, its
	// rows and forms the card's, the card's hairline once between rows.
	framed?: boolean;
}

const WAITING = Array.from({ length: WAITING_ROWS }, (_, index) => index);

// The item's leading mark, of the kind the slot names.
function leadingOf<T>(slot: LeadingSlot<T>, item: T): RowLeading {
	if (slot.avatar !== undefined) return { avatar: slot.avatar(item) };
	if (slot.icon !== undefined) return { icon: slot.icon(item) };
	if (slot.check !== undefined) return { check: slot.check(item) };
	return { status: slot.status(item) };
}

// The List every List and a Group's `list` draw. Outside the package's
// exports: `framed` is the Group's alone.
export function ListBase<T, V extends string | null = string>(
	props: ListProps<T, V> & ListInternal,
) {
	const words = useWords();
	// The list's identity: its waiting rows take their bars' widths from it.
	const list = useId();
	// The keys of the tree's folded branches; every branch starts open.
	const [folded, setFolded] = useState<readonly string[]>([]);
	const input = {
		query: props.query,
		items: props.items,
		loading: props.loading,
		sectionLoading: useContext(LoadingContext),
		hasEmpty: props.empty !== undefined,
	};
	const framed = props.framed === true;
	// A failed, missing or empty form stands on the Group's card when framed.
	const fit = framed ? "group" : "frame";
	const state = listState(input);
	// Items given while the list loads (a row map with a trailing slot, no tree):
	// the rows stand as loaded, their trailing values waiting.
	const known =
		state === "pending" &&
		props.loading === true &&
		props.row?.trailing !== undefined &&
		props.row.children === undefined &&
		(props.items?.length ?? 0) > 0;
	// On a Group's card (framed) the card is the rows' box: each row after the
	// first draws the group's hairline above it. Two-line rows (a map with a `meta`) abut
	// under the same hairline.
	// A tree's rows abut, so its rails run unbroken.
	const divided =
		props.row?.meta !== undefined && props.row.children === undefined;
	// Whether a row of the loaded list has a more act: the rows without one then
	// keep its square, so every row's end stands at one x.
	let room = false;
	const frame = (rows: readonly ReactElement[], tree = false) => {
		if (!framed && !divided)
			return <View className={tree ? LIST_TREE : LIST}>{rows}</View>;
		const lines = rows.map((row, index) => (
			<View key={row.key ?? index} className={between(index)}>
				{row}
			</View>
		));
		return framed ? lines : <View className={LIST_DIVIDED}>{lines}</View>;
	};
	if (state === "pending" && !known) {
		return frame(
			WAITING.map((index) => {
				if (props.row)
					return (
						<RowWait
							key={index}
							shape={rowShape(props.row)}
							list={list}
							index={index}
						/>
					);
				if (props.meter)
					return (
						<View key={index} className={LIST_ITEM}>
							<MeterWait {...meterShape(props.meter)} />
						</View>
					);
				if (props.definition)
					return (
						<DefinitionWait
							key={index}
							shape={definitionShape(props.definition)}
							index={index}
						/>
					);
				return <FileWait key={index} {...fileShape(props.file)} />;
			}),
			props.row?.children !== undefined,
		);
	}
	if (state === "missing") return <MissingBase fit={fit} />;
	if (state === "failed" && props.query !== undefined) {
		return (
			<EmptyBase
				fit={fit}
				tone="failed"
				sentence={props.sentence}
				act={{ label: words.retry, onAct: retryOf(props.query) }}
			/>
		);
	}
	if (state === "empty" && props.empty)
		return <EmptyBase fit={fit} tone="rest" {...props.empty} />;
	const items = (props.query ? props.query.data : props.items) ?? [];
	if (props.row) {
		const { row } = props;
		const rowOf = (item: T, tree?: RowTree) => (
			<ListRowBase
				key={row.key(item)}
				change={row.change?.(item)}
				leading={row.leading && leadingOf(row.leading, item)}
				title={row.title(item)}
				meta={row.meta?.(item)}
				trailing={known ? undefined : row.trailing?.(item)}
				status={row.status?.(item)}
				warning={row.warning?.(item)}
				lock={row.lock?.(item)}
				chip={row.chip?.(item)}
				entry={row.entry?.(item)}
				steps={row.steps?.(item)}
				dim={row.dim?.(item)}
				wrap={row.wrap}
				act={row.act?.(item)}
				more={row.more?.(item)}
				href={row.href?.(item)}
				selected={row.selected?.(item)}
				onOpen={row.onOpen ? () => row.onOpen?.(item) : undefined}
				waits={known}
				room={room}
				tree={tree}
			/>
		);
		const { children } = row;
		const { more } = row;
		if (more !== undefined) {
			const every =
				children === undefined
					? items
					: treeRows(items, { key: row.key, children }, []).map(
							(each) => each.item,
						);
			room = every.some((item) => more(item)?.length);
		}
		if (children === undefined) return frame(items.map((item) => rowOf(item)));
		// Each row of the tree is given its depth and fold.
		return frame(
			treeRows(items, { key: row.key, children }, folded).map((each) =>
				rowOf(each.item, {
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
			items.map((item) => (
				<View key={meter.key(item)} className={LIST_ITEM}>
					<Meter
						label={meter.label(item)}
						value={meter.value(item)}
						max={meter.max(item)}
						mark={meter.mark?.(item)}
						{...(meter.counts
							? { counts: meter.counts(item) }
							: { meta: meter.meta?.(item) })}
					/>
				</View>
			)),
		);
	}
	if (props.definition) {
		const { definition } = props;
		return frame(
			items.map((item) => {
				const locked = definition.locked?.(item);
				const key = definition.key(item);
				const shared = {
					change: definition.change?.(item),
					label: definition.label(item),
					value: definition.value?.(item),
					copyable: definition.copyable,
				};
				if (locked)
					return <DefinitionRow key={key} {...shared} locked={locked} />;
				return (
					<DefinitionRow
						key={key}
						{...shared}
						description={definition.description?.(item)}
						act={definition.act?.(item)}
						href={definition.href?.(item)}
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
		items.map((item) => (
			<FileRow
				key={file.key(item)}
				path={file.path(item)}
				added={file.added(item)}
				removed={file.removed(item)}
				seen={file.seen?.(item)}
				change={file.change?.(item)}
				chip={file.chip?.(item)}
				href={file.href?.(item)}
				onOpen={file.onOpen ? () => file.onOpen?.(item) : undefined}
			/>
		)),
	);
}
