import type { IconName } from "@fcalell/ui-core/descriptors";
import type { ButtonAct, ButtonFit } from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";
import { ButtonBase } from "./base.tsx";

/** A labelled act. */
export interface ButtonProps extends Closed {
	/** The act's kind: the accent fill (`primary`, the default), the danger fill, a hairline, the hairline in danger ink, or quiet words in the meta ink. */
	act?: ButtonAct;
	/** What it sits in: a body (the default), a bar, or full width under a field. */
	fit?: ButtonFit;
	/** A glyph before the label, in the label's ink. */
	icon?: IconName;
	/** The visible text, and the act's accessible name (a short phrase; truncates). */
	label: string;
	/** A number after the label, in the label's ink. */
	count?: number;
	/** A wait, in seconds left: the act is inert while it is above zero, its count drawn, and it draws no reason, so its row never grows. At zero the count's slot stays, hidden, so the act keeps its width. */
	wait?: number;
	/** Runs the act. A promise it returns holds the act pending until it settles: inert at the press, then (after `ACT_DELAY`) its glyph and label hidden under a spinner, its name kept. A rejection reads under the act. */
	onAct?: () => unknown;
	/** The act's own sentence for a rejection the server gives no refusal for. */
	failed?: string;
	/** Why the act cannot run (a sentence; wraps): it is inert, and shows this under itself once pressed or once its form or sheet is touched. */
	blocked?: string;
}

/** A labelled act; pending and blocked acts keep focus and ignore the press. It holds its own run, and draws a rejection in a line under itself. */
export function Button({
	act,
	fit,
	icon,
	label,
	count,
	wait,
	onAct,
	failed,
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
			failed={failed}
			blocked={blocked}
			line
		/>
	);
}
