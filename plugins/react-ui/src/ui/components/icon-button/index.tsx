import type { IconName } from "@fcalell/ui-core/descriptors";
import type { IconButtonFit } from "@fcalell/ui-core/variants";
import { useAct } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { IconButtonBase } from "./base.tsx";

/** An icon-only act. */
export interface IconButtonProps extends Closed {
	/** The glyph. */
	icon: IconName;
	/** What it sits in: a body (the default), a bar, or a field's end. */
	fit?: IconButtonFit;
	/** The act's accessible name (a short phrase; read aloud, never drawn). */
	label: string;
	/** Runs the act. A promise it returns holds the act pending until it settles: inert at the press, then (after `ACT_DELAY`) its glyph swapped for a spinner, its size and name kept. A rejection raises a failed toast with Retry. */
	onAct: () => unknown;
}

/** A square act with no boundary at rest; the wash is its ground. Inside a disabled field it is inert and keeps focus. It holds its own run. */
export function IconButton({ icon, fit, label, onAct }: IconButtonProps) {
	const acting = useAct("toast");
	return (
		<IconButtonBase
			icon={icon}
			fit={fit}
			label={label}
			pending={acting.pending !== undefined}
			onClick={() => acting.run(true, { onAct })}
		/>
	);
}
