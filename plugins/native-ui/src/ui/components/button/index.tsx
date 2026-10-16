import type { IconName } from "@fcalell/ui-core/descriptors";
import type { ButtonAct, ButtonFit } from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed";
import { ButtonBase } from "./base";

export interface ButtonProps extends Closed {
	act?: ButtonAct;
	fit?: ButtonFit;
	icon?: IconName;
	/** The visible text, and the act's accessible name (a short phrase; truncates). */
	label: string;
	count?: number;
	wait?: number;
	/** Runs the act. A promise it returns holds the act pending until it settles: inert at the press, then (after `ACT_DELAY`) its glyph and label hidden under a spinner, its name kept. A rejection reads under the act. */
	onAct?: () => unknown;
	/** Why the act cannot run: it is inert, and shows this under itself once pressed or once its form or sheet is touched (a sentence; wraps). */
	blocked?: string;
}

// A labelled act, its count after the label. Pending and blocked acts stay
// focusable and ignore the press; a blocked one says why under itself once
// pressed or once its form or sheet is touched.
export function Button({
	act,
	fit,
	icon,
	label,
	count,
	wait,
	onAct,
	blocked,
}: ButtonProps) {
	return (
		<ButtonBase
			act={act}
			fit={fit}
			icon={icon}
			label={label}
			count={count}
			wait={wait}
			onAct={onAct}
			blocked={blocked}
			line
		/>
	);
}
