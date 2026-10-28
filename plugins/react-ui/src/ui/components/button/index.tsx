import type { Decision, IconName } from "@fcalell/ui-core/descriptors";
import type { ButtonAct, ButtonFit } from "@fcalell/ui-core/variants";
import { use } from "react";
import { type ActSheetProps, useAct } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { ReasonHostContext } from "../../lib/reason.ts";
import { ActSheet } from "../sheet/act.tsx";
import { ButtonBase } from "./base.tsx";
import { IconButtonBase, IconButtonLink } from "./glyph.tsx";
import { ButtonLink } from "./link.tsx";

interface Named extends Closed {
	/** The act's accessible name and, in the labelled forms, its visible text (a short phrase; truncates). In the icon form it is read aloud and shown in a tooltip, never drawn. */
	label: string;
}

/** A labelled act that runs. */
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
	/** Why the act cannot run (a sentence; wraps): it is inert, and shows this under itself once pressed or once its form or sheet is touched. */
	blocked?: string;
	href?: undefined;
	glyph?: undefined;
}

/** The icon form that runs: a square act with no boundary at rest. */
export interface ButtonGlyphProps extends Named {
	/** `quiet` (the default) draws the glyph in the meta ink, `destructive` in the danger ink (an act that removes or ends something). */
	act?: "quiet" | "destructive";
	/** What it sits in: a body (the default), or a field's end. */
	fit?: ButtonFit;
	/** The glyph. */
	icon: IconName;
	/** Draws the glyph alone, the label its tooltip and accessible name. */
	glyph: true;
	/** Runs the act. A promise it returns holds the act pending until it settles: inert at the press, then (after `ACT_DELAY`) its glyph swapped for a spinner, its size and name kept. A rejection raises a failed toast with Retry. */
	onAct?: () => unknown;
	/** Asked before `onAct` runs, as a decision over the page: declined, nothing runs. */
	confirm?: Decision;
	/** Toasted once `onAct` resolves (a sentence). */
	done?: string;
	/** The route gone to once `onAct` resolves, after `done`. */
	to?: string;
	/** The sheet a press opens, in place of running `onAct`. */
	sheet?: ActSheetProps;
	/** Why the act cannot run: it stands inert (its holder draws the reason). */
	blocked?: string;
	href?: undefined;
}

/** The link form: an anchor to a route or an external URL, which runs nothing, so it never pends and is never blocked. */
export interface ButtonRouteProps extends Named {
	/** Without an `act` the anchor is accent ink in the type of the line it sits in; with one, it takes that act's look. */
	act?: ButtonAct;
	/** On its own at the target height (the default), or `inline`, inside a line of text and underlined at rest (the accent ink alone). */
	fit?: ButtonFit | "inline";
	/** A glyph before the label, in an act's look. */
	icon?: IconName;
	/** Where it goes: a route of the app or an external URL. */
	href: string;
	glyph?: undefined;
}

/** The link form drawn as an icon. */
export interface ButtonRouteGlyphProps extends Named {
	fit?: ButtonFit;
	icon: IconName;
	glyph: true;
	href: string;
}

export type ButtonProps =
	| ButtonRunProps
	| ButtonGlyphProps
	| ButtonRouteProps
	| ButtonRouteGlyphProps;

/** An act: a labelled one that runs (it holds its own run, and draws a rejection in a line under itself), the same with an `href` as a link, or with `glyph` as an icon alone. Pending and blocked acts keep focus and ignore the press. */
export function Button(props: ButtonProps) {
	if (props.href !== undefined)
		return props.glyph ? (
			<IconButtonLink
				icon={props.icon}
				fit={props.fit}
				label={props.label}
				href={props.href}
			/>
		) : (
			<ButtonLink
				act={props.act}
				fit={props.fit}
				icon={props.icon}
				label={props.label}
				href={props.href}
			/>
		);
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

// The icon form holds its own run: a rejection raises a failed toast.
function Glyph({
	act,
	fit,
	icon,
	label,
	blocked,
	onAct,
	...wiring
}: Omit<ButtonGlyphProps, "glyph">) {
	const acting = useAct("toast");
	// Under a host that draws a blocked act's reason (a Section's head, a
	// row's acts), a blocked press is handed to it; with none the act is inert.
	const host = use(ReasonHostContext);
	const held = blocked !== undefined && host !== undefined;
	return (
		<>
			<IconButtonBase
				icon={icon}
				fit={fit}
				label={label}
				destructive={act === "destructive"}
				disabled={blocked !== undefined && !held}
				blocked={held || undefined}
				pending={acting.pending !== undefined}
				onClick={() =>
					held
						? host.press()
						: acting.run(true, {
								onAct,
								label,
								destructive: act === "destructive",
								...wiring,
							})
				}
			/>
			<ActSheet acting={acting} of={() => wiring.sheet} />
		</>
	);
}
