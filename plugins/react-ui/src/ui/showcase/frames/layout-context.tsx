import { cn } from "@fcalell/ui-core/cn";
import { row, text, textStrong } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { GroupItem } from "../../components/group/index.tsx";
import { List, type RowSlots } from "../../components/list/index.tsx";
import type { QueryLike } from "../../components/query-boundary/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

// Context the layout frames place inside their molecules: stand-in rows at
// the row cell until the row molecules are built, the width a board's frame
// draws a molecule at, shrinking to a narrow viewport, and a collection's
// query in the frame's state.

const NAMES = ["Ana Ruiz", "Ben Kaya", "Ema Okafor"];

// A query in the frame's state: its items at rest, none when empty.
export function queryOf<T>(
	state: ShowcaseFrame["state"],
	items: readonly T[],
): QueryLike<readonly T[]> {
	let data: readonly T[] | undefined;
	if (state === "rest") data = items;
	if (state === "empty") data = [];
	return {
		data,
		isPending: state === "loading",
		isError: state === "error",
		refetch: () => {},
	};
}

export function Wide(props: { children: ReactNode }) {
	return (
		<div className="flex flex-col gap-sections w-sheet max-w-full">
			{props.children}
		</div>
	);
}

// The stand-in names as a List's items and their row map; a frame that
// tests what holds a List (a Section) passes them to a List directly.
export const STAND_INS: readonly string[] = NAMES;
export const STAND_IN_ROW: RowSlots<string> = {
	key: (name) => name,
	title: (name) => name,
};

export function StandInList() {
	return <List items={STAND_INS} row={STAND_IN_ROW} />;
}

function StandInRow(props: { name: string }) {
	return (
		<div className={cn(row({}), "flex items-center")}>
			<span
				className={cn(text({ role: "body" }), textStrong({ role: "body" }))}
			>
				{props.name}
			</span>
		</div>
	);
}

/** The stand-in rows of a card, as a Group's entries. */
export const STAND_IN_ENTRIES: readonly GroupItem[] = NAMES.map((name) => ({
	key: name,
	row: <StandInRow name={name} />,
}));

/** The stand-in rows on the page: static rows no component owns. */
export function StandInRows() {
	return NAMES.map((name) => <StandInRow key={name} name={name} />);
}
