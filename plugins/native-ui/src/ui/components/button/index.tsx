import type { Decision, IconName } from "@fcalell/ui-core/descriptors";
import type { ButtonAct, ButtonFit } from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { type ActSheetProps, useAct } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { FieldDisabled } from "../../lib/field";
import { ActSheet } from "../sheet/act";
import { ButtonBase } from "./base";
import { IconButtonBase } from "./glyph";
import { ButtonLink } from "./link";

interface Named extends Closed {
	/** The act's accessible name and, in the labelled forms, its visible text (a short phrase; truncates). In the icon form it is read aloud, never drawn. */
	label: string;
}

export interface ButtonRunProps extends Named {
	/** The act's kind: the accent fill (`primary`, the default), the danger fill, a hairline, the hairline in danger ink, or quiet words in the meta ink. */
	act?: ButtonAct;
	/** What it sits in: a body (the default), or full width under a field. */
	fit?: ButtonFit;
	/** A glyph before the label, in the label's ink. */
	icon?: IconName;
	/** A number after the label, in the label's ink. */
	count?: number;
	/** A wait, in seconds left: the act is inert while it is above zero, its count drawn, and it draws no reason, so its row never grows. At zero the count's slot stays, hidden, so the act keeps its width. */
	wait?: number;
	/** Runs the act. A promise it returns holds the act pending until it settles: inert at the press, then (after `ACT_DELAY`) its glyph and label hidden under a spinner, its name kept. A rejection reads under the act. */
	onAct?: () => unknown;
	/** Asked before `onAct` runs, as a decision over the page: declined, nothing runs. Its act carries this act's label. */
	confirm?: Decision;
	/** Toasted once `onAct` resolves (a sentence). */
	done?: string;
	/** The route gone to once `onAct` resolves, after `done`. */
	to?: string;
	/** The sheet a press opens, in place of running `onAct` (exclusive with it): open from the press until it is dismissed or its `submit` has resolved. */
	sheet?: ActSheetProps;
	/** Why the act cannot run: it is inert, and shows this under itself once pressed or once its form or sheet is touched (a sentence; wraps). */
	blocked?: string;
	href?: undefined;
	glyph?: undefined;
}

export interface ButtonGlyphProps extends Named {
	/** `quiet` (the default) draws the glyph in the meta ink, `primary` on the accent fill (the act its bar is for). */
	act?: "quiet" | "primary";
	fit?: ButtonFit;
	icon: IconName;
	/** Draws the glyph alone, the label its accessible name. */
	glyph: true;
	/** Runs the act. A promise it returns holds the act pending until it settles: inert at the press, then (after `ACT_DELAY`) its glyph swapped for a spinner. A rejection raises a failed toast with Retry. */
	onAct?: () => unknown;
	/** Asked before `onAct` runs, as a decision over the page: declined, nothing runs. */
	confirm?: Decision;
	/** Toasted once `onAct` resolves (a sentence). */
	done?: string;
	/** The route gone to once `onAct` resolves, after `done`. */
	to?: string;
	/** The sheet a press opens, in place of running `onAct`. */
	sheet?: ActSheetProps;
	href?: undefined;
}

export interface ButtonRouteProps extends Named {
	/** Where it goes: a route of the app (navigated through the router) or an external URL (opened by the OS). */
	href: string;
	/** On its own at the target height (the default), or `inline`, a run of the line of text it sits in. */
	fit?: "body" | "inline";
	glyph?: undefined;
}

export type ButtonProps = ButtonRunProps | ButtonGlyphProps | ButtonRouteProps;

// An act: a labelled one that runs, its count after the label (pending and
// blocked acts stay focusable and ignore the press; a blocked one says why
// under itself once pressed or once its form or sheet is touched); with an
// `href` a link in accent ink, which runs nothing; with `glyph` a square act
// with no boundary at rest, the label its name, never drawn, inert inside a
// disabled field. It holds its own run.
export function Button(props: ButtonProps) {
	if (props.href !== undefined)
		return <ButtonLink fit={props.fit} label={props.label} href={props.href} />;
	if (props.glyph) return <Glyph {...props} />;
	return (
		<ButtonBase
			act={props.act}
			fit={props.fit}
			icon={props.icon}
			label={props.label}
			count={props.count}
			wait={props.wait}
			onAct={props.onAct}
			confirm={props.confirm}
			done={props.done}
			to={props.to}
			sheet={props.sheet}
			blocked={props.blocked}
			line
		/>
	);
}

function Glyph({
	act,
	icon,
	fit,
	label,
	onAct,
	...wiring
}: Omit<ButtonGlyphProps, "glyph">) {
	const disabled = useContext(FieldDisabled);
	const acting = useAct("toast");
	return (
		<>
			<IconButtonBase
				icon={icon}
				fit={fit}
				label={label}
				onAct={() => acting.run(true, { onAct, label, ...wiring })}
				pending={acting.pending !== undefined}
				disabled={disabled}
				primary={act === "primary"}
			/>
			<ActSheet acting={acting} of={() => wiring.sheet} />
		</>
	);
}
