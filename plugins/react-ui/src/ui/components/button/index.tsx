import { cn } from "@fcalell/ui-core/cn";
import type { Decision, IconName } from "@fcalell/ui-core/descriptors";
import {
	type ButtonAct,
	type ButtonFit,
	link,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import { type ActSheetProps, useAct } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { ReasonHostContext } from "../../lib/reason.ts";
import { ActSheet } from "../sheet/act.tsx";
import { ButtonBase } from "./base.tsx";
import { IconButtonBase, IconButtonLink } from "./glyph.tsx";
import { ButtonLink, TEXT_PRESS } from "./link.tsx";

interface Named extends Closed {
	/** The act's accessible name and, in the labelled forms, its visible text (a short phrase; truncates). In the icon form it is read aloud and shown in a tooltip, never drawn. */
	label: string;
}

/** A labelled act that runs. */
export interface ButtonRunProps extends Named {
	/** The act's kind: the accent fill (`primary`, the default), the danger fill, a hairline, the hairline in danger ink, or quiet words in the meta ink. */
	act?: ButtonAct;
	/** What it sits in: a body (the default), full width under a field, or `inline`, inside a sentence after its caption ("Didn't get the code? Resend"): its words in the accent ink, underlined, in the sentence's type; a rejection raises a failed toast, and blocked it stands inert in the meta ink, the sentence saying why. */
	fit?: ButtonFit | "inline";
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
	/** `quiet` (the default) draws the glyph in the meta ink, `destructive` in the danger ink (an act that removes or ends something), `primary` on the accent fill (the act its bar is for). */
	act?: "quiet" | "destructive" | "primary";
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
	if (props.glyph) return <RunGlyph {...props} />;
	if (props.fit === "inline") return <RunInline {...props} />;
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

// The inline form's words take the meta ink while they cannot run.
const INLINE_INERT =
	"aria-disabled:text-ink-meta aria-disabled:decoration-transparent";

// The inline form that runs, holding its own run: inert and `aria-busy` while
// it pends, a rejection raised as a failed toast.
function RunInline(props: ButtonRunProps) {
	const { label, blocked, onAct, confirm, done, to, sheet } = props;
	const acting = useAct("toast");
	const pending = acting.pending !== undefined;
	const inert = blocked !== undefined || pending;
	const run = () =>
		acting.run(true, { onAct, label, confirm, done, to, sheet });
	return (
		<>
			<button
				type="button"
				aria-busy={pending || undefined}
				aria-disabled={inert || undefined}
				onClick={inert ? undefined : run}
				className={cn(link({ fit: "inline" }), TEXT_PRESS.inline, INLINE_INERT)}
			>
				{label}
			</button>
			<ActSheet acting={acting} of={() => sheet} />
		</>
	);
}

/** The icon form that runs, holding its own run: a rejection raises a failed toast. A host whose rows stand in one Tab stop (a grid) hands it `tabIndex={-1}`. Outside the package's exports. */
export function RunGlyph({
	act,
	fit,
	icon,
	label,
	blocked,
	onAct,
	tabIndex,
	...wiring
}: Omit<ButtonGlyphProps, "glyph"> & { tabIndex?: -1 }) {
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
				primary={act === "primary"}
				disabled={blocked !== undefined && !held}
				blocked={held || undefined}
				pending={acting.pending !== undefined}
				tabIndex={tabIndex}
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
