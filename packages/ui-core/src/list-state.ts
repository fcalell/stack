// The decisions a `List` and the `Section` around it make before they draw,
// free of any framework: both platforms run this one source, and it is
// tested without rendering.

import type { RowGround } from "./variants.ts";

export type ListState = "pending" | "failed" | "empty" | "loaded";

export interface ListInput {
	query?: {
		isPending: boolean;
		isError: boolean;
		data: readonly unknown[] | undefined;
	};
	items?: readonly unknown[];
	// The items are on their way (a compound body's loading form).
	loading?: boolean;
	// A loading Section around the list waits.
	sectionLoading: boolean;
	// A Section around the list takes its busy state.
	inSection: boolean;
	// The list has an empty form to draw.
	hasEmpty: boolean;
}

// The list's own items wait: its query is pending or `loading` is set. A
// Section around registers it as a waiter.
export function listWaits(input: ListInput): boolean {
	return input.query?.isPending === true || input.loading === true;
}

// Pending while its own items wait or a loading Section waits; failed when
// its query fails; empty when no item answers and an empty form is given;
// else loaded (no item and no empty form draws none).
export function listState(input: ListInput): ListState {
	if (listWaits(input) || input.sectionLoading) return "pending";
	if (input.query?.isError) return "failed";
	const items = input.query ? input.query.data : input.items;
	if (!items?.length && input.hasEmpty) return "empty";
	return "loaded";
}

// The item count a list reports to the Section around it: its items' length
// once they answer, none while they wait or once its query fails.
export function listCount(input: ListInput): number | undefined {
	const state = listState(input);
	if (state === "pending" || state === "failed") return undefined;
	return (input.query ? input.query.data : input.items)?.length ?? 0;
}

// Busy while its own items wait outside a Section; in one, the Section is
// busy once.
export function listBusy(input: ListInput): boolean {
	return listWaits(input) && !input.inSection;
}

// The failed form's Retry: it refetches the query.
export function retryOf(query: { refetch: () => unknown }): () => void {
	return () => {
		query.refetch();
	};
}

// What a list's rows stand on: in a `Group`, the card (at the card's inset,
// the group's hairline once between them, the card their box and the frame
// of its failed and empty forms); anywhere else the list ground, in the
// list's own box.
export function listGround(inGroup: boolean): RowGround {
	return inGroup ? "group" : "list";
}

// What a waiting `Group` draws: the waiting rows of the Lists it holds
// (however deep), each in the slots its map declares; with no List, setting
// row skeletons in place of its static rows.
export function groupWait(lists: number): "rows" | "settings" {
	return lists > 0 ? "rows" : "settings";
}

// The kind of mark every row of a list leads with.
export type LeadingKind = "avatar" | "icon" | "status";

// The slots a waiting ListRow draws, known before any item: its leading mark
// by kind, a meta line (at a chip's height when a chip may stand on it), a
// trailing value, and the more act's room, kept empty.
export interface RowShape {
	leading: LeadingKind | null;
	meta: boolean;
	chip: boolean;
	trailing: boolean;
	more: boolean;
}

// A `leading` slot: one of its keys holds the item's mark.
type LeadingKeys = { avatar?: unknown; icon?: unknown; status?: unknown };

// The kind a `leading` slot declares by its one key.
function leadingKind(leading: LeadingKeys | undefined): LeadingKind | null {
	if (leading === undefined) return null;
	if (leading.avatar !== undefined) return "avatar";
	if (leading.icon !== undefined) return "icon";
	return "status";
}

// The waiting row's shape from the slots a `row` map declares, read by key:
// no slot function runs.
export function rowShape(slots: {
	leading?: LeadingKeys;
	meta?: unknown;
	status?: unknown;
	chip?: unknown;
	trailing?: unknown;
	more?: unknown;
}): RowShape {
	return {
		leading: leadingKind(slots.leading),
		meta:
			slots.meta !== undefined ||
			slots.status !== undefined ||
			slots.chip !== undefined,
		chip: slots.chip !== undefined,
		trailing: slots.trailing !== undefined,
		more: slots.more !== undefined,
	};
}

// The slots a waiting Meter draws, known before any item: the label, share
// and bar always, the meta line when the `meter` map declares one.
export interface MeterShape {
	meta: boolean;
}

// The waiting meter's shape from the slots a `meter` map declares, read by
// key: no slot function runs.
export function meterShape(slots: { meta?: unknown }): MeterShape {
	return { meta: slots.meta !== undefined };
}

// The count a Section shows: its own `count` when it has one (a total its
// lists do not hold), else its lists' total once every list has answered (a
// list still waiting or failed gives none), else none; an empty collection
// shows none, its empty state saying so.
export function sectionCount(
	own: number | undefined,
	lists: readonly (number | undefined)[],
): number | undefined {
	if (own !== undefined) return own === 0 ? undefined : own;
	if (lists.length === 0) return undefined;
	let total = 0;
	for (const value of lists) {
		if (value === undefined) return undefined;
		total += value;
	}
	return total === 0 ? undefined : total;
}
