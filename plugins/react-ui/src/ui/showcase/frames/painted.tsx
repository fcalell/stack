import { Field } from "@base-ui/react/field";
import { cn } from "@fcalell/ui-core/cn";
import { text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { FieldOwned } from "../../lib/field.ts";
import type { ShowcaseFrame } from "../cells.ts";

/** Whether the frame draws a `PAINT` cell: an atom's painted form beside its loaded one. */
export const isPaint = (frame: ShowcaseFrame) =>
	frame.cell.name.startsWith("PAINT.");

// The loaded part, then the same part painted, at rest: the painted state is
// no interaction, so the other states have no form for it. items-start, so the
// frame's column does not stretch the inline parts.
export function beside(
	frame: ShowcaseFrame,
	loaded: ReactNode,
	painted: ReactNode,
) {
	if (frame.state !== "rest") return undefined;
	return (
		<div className="flex flex-wrap items-center gap-section">
			{loaded}
			{painted}
		</div>
	);
}

// A control under its label, as a FormField gives it one: the painted form of
// a control keeps the label it will have, and a loaded one is named for the
// accessibility run. The wrapper takes no more than its row has, so the
// control truncates as it does beside its painted form.
export function labelled(control: ReactNode) {
	return (
		<FieldOwned value>
			<Field.Root className="flex flex-col min-w-0 max-w-full">
				<Field.Label className={cn(text({ role: "body" }), "truncate")}>
					Workspace
				</Field.Label>
				{control}
			</Field.Root>
		</FieldOwned>
	);
}
