import type { IconName } from "@fcalell/ui-core/descriptors";
import type { IconButtonFit } from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { useAct } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { FieldDisabled } from "../../lib/field";
import { IconButtonBase } from "./base";

export interface IconButtonProps extends Closed {
	icon: IconName;
	fit?: IconButtonFit;
	/** The act's accessible name (a short phrase; read aloud, never drawn). */
	label: string;
	/** Runs the act. A promise it returns holds the act pending until it settles: inert at the press, then (after `ACT_DELAY`) its glyph swapped for a spinner. A rejection raises a failed toast with Retry. */
	onAct: () => unknown;
	/** The act's own sentence for a rejection the server gives no refusal for. */
	failed?: string;
}

// A square act with no boundary at rest; the label is its name, never
// drawn. Inside a disabled field it is inert. It holds its own run.
export function IconButton({
	icon,
	fit,
	label,
	onAct,
	failed,
}: IconButtonProps) {
	const disabled = useContext(FieldDisabled);
	const acting = useAct("toast");
	return (
		<IconButtonBase
			icon={icon}
			fit={fit}
			label={label}
			onAct={() => acting.run(true, { onAct, failed })}
			pending={acting.pending !== undefined}
			disabled={disabled}
		/>
	);
}
