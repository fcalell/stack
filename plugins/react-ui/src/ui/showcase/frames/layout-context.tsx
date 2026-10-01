import { cn } from "@fcalell/ui-core/cn";
import { row, text, textStrong } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";

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
