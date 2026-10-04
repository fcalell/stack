import { cn } from "@fcalell/ui-core/cn";
import { row, text, textStrong } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { List, type RowSlots } from "../../components/list/index.tsx";

// Context the layout frames place inside their molecules: stand-in rows at
// the row cell until the row molecules are built, and the width a board's
// frame draws a molecule at, shrinking to a narrow viewport.

const NAMES = ["Ana Ruiz", "Ben Kaya", "Ema Okafor"];

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

export function StandInRows(props: { ground: "list" | "group" }) {
	return NAMES.map((name) => (
		<div
			key={name}
			className={cn(row({ ground: props.ground }), "flex items-center")}
		>
			<span
				className={cn(text({ role: "body" }), textStrong({ role: "body" }))}
			>
				{name}
			</span>
		</div>
	));
}
