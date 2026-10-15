import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import { type ButtonAct, button, buttonLabel } from "@fcalell/ui-core/variants";
import { use } from "react";
import { useAct } from "../../lib/act.ts";
import { ActInert, endSubmit, SubmitContext } from "../../lib/form.ts";
import { PAINT_CONTROL } from "../../lib/paint.tsx";
import { ReasonHostContext, usePressed } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { CountBase } from "../count/base.tsx";
import { Icon } from "../icon/index.tsx";
import { Spinner } from "../spinner/index.tsx";
import type { ButtonProps } from "./index.tsx";
import { BOX, LABEL, PRESS } from "./link.tsx";
import { Reason } from "./reason.tsx";

const STACK = "flex flex-col items-start gap-pair";
const GLYPH = "shrink-0";
const PENDING = "opacity-0";
// Pending, the label and glyph fade out and the fill and spinner fade in once
// `--act-delay` has run (`globals.css`).
const FADE_OUT = "animate-act-out";
const FADE_IN = "animate-act-in";
// Painted, the act keeps its loaded box and draws none of its content.
const HIDDEN = "invisible";
const SPINNER_LAYER =
	"absolute inset-0 flex items-center justify-center rounded-[inherit]";

const FILL_PENDING: Record<ButtonAct, string> = {
	primary: "bg-act-accent-pending",
	danger: "bg-act-danger-pending",
	secondary: "",
	destructive: "",
	quiet: "",
};

const BLOCKED: Record<ButtonAct, string> = {
	primary: "aria-disabled:bg-fill-disabled aria-disabled:text-ink-meta",
	danger: "aria-disabled:bg-fill-disabled aria-disabled:text-ink-meta",
	secondary: "aria-disabled:text-ink-disabled",
	destructive: "aria-disabled:text-ink-disabled",
	quiet: "aria-disabled:text-ink-disabled",
};

// A filled act's label reads in the meta ink on the disabled fill, which holds
// 4.5:1; the unfilled acts' words are in the disabled ink.
const LABEL_BLOCKED: Record<ButtonAct, string> = {
	primary: "text-ink-meta",
	danger: "text-ink-meta",
	secondary: "text-ink-disabled",
	destructive: "text-ink-disabled",
	quiet: "text-ink-disabled",
};

// Pending and blocked both set aria-disabled, so one look is chosen: pending
// over blocked, and neither takes the press. A pending act keeps its rest box
// until the delay has run, then the fill layer fades over it.
function lookOf(kind: ButtonAct, pending: boolean, muted: boolean): string {
	if (pending) return "";
	if (muted) return BLOCKED[kind];
	return PRESS[kind];
}

/** The act every Button renders; it holds its own run: inert and `aria-busy` at the press, the pending look after `ACT_DELAY`, a rejection drawn in a failed toast with Retry. `ink` is the text class a quiet act draws in (a Banner's kind's ink, as its glyph does). `painted` is the act while its data is not here: its box filled, its content not drawn, inert. `pending` is a host's state handed down: the host holds the run, so a press calls the handler as it is and the act holds none of its own. `line` draws a rejection in a reason line under the act instead (the public Button standing alone). Outside the package's exports: a molecule that draws an act hands it its ink. */
export function ButtonBase({
	act,
	fit,
	icon,
	label,
	count,
	wait,
	onAct,
	failed,
	blocked,
	ink,
	painted,
	pending: given,
	line,
}: ButtonProps & {
	ink?: string;
	painted?: boolean;
	pending?: boolean;
	line?: boolean;
}) {
	const kind = act ?? "primary";
	const muted = !painted && blocked !== undefined;
	const { touched } = useTouched();
	const host = use(ReasonHostContext);
	const submits = use(SubmitContext);
	// A host with a line of its own draws a rejection there; the public Button
	// alone draws it under itself.
	const acting = useAct(line && !host ? "line" : "toast");
	const pending = given === true || acting.pending !== undefined;
	// Inert beside a pending act: the blocked look and no press, no reason.
	const waiting = wait !== undefined && wait > 0;
	const inert = (use(ActInert) || waiting) && !pending;
	const [pressed, keep] = usePressed(blocked);
	const said = muted && (pressed || touched);
	const look = painted ? PAINT_CONTROL : lookOf(kind, pending, muted || inert);
	const labelLook = pending
		? FADE_OUT
		: (muted || inert) && LABEL_BLOCKED[kind];
	const quietInk = kind === "quiet" && ink;
	const press = () => {
		if (inert || pending) return;
		if (muted) {
			if (host) host.press();
			else keep();
		} else if (given === undefined)
			acting.run(true, { onAct: () => onAct?.(), failed });
		else onAct?.();
	};
	// Blocked is not Base UI's `disabled`, which swallows the press that shows
	// the reason: aria-disabled is set by hand, and the caller's props win the merge.
	const control = (
		<BaseButton
			disabled={pending}
			focusableWhenDisabled
			type={submits ? "submit" : "button"}
			aria-disabled={pending || muted || inert || undefined}
			aria-busy={pending || undefined}
			inert={painted || undefined}
			onClick={(event) => {
				endSubmit(submits, event);
				press();
			}}
			className={cn(button({ act: kind, fit }), BOX, quietInk, look)}
		>
			{icon ? (
				<span className={cn(GLYPH, pending && FADE_OUT, painted && HIDDEN)}>
					<Icon name={icon} fit="control" />
				</span>
			) : null}
			<span
				className={cn(
					buttonLabel({ act: kind }),
					LABEL,
					quietInk,
					labelLook,
					painted && HIDDEN,
				)}
			>
				{label}
			</span>
			{wait !== undefined ? (
				<span
					className={cn(
						GLYPH,
						!waiting && PENDING,
						pending && FADE_OUT,
						painted && HIDDEN,
					)}
				>
					<CountBase value={wait} inAct />
				</span>
			) : count !== undefined ? (
				<span className={cn(GLYPH, pending && FADE_OUT, painted && HIDDEN)}>
					<CountBase value={count} inAct />
				</span>
			) : null}
			{pending ? (
				<span className={cn(SPINNER_LAYER, FILL_PENDING[kind], FADE_IN)}>
					<Spinner />
				</span>
			) : null}
		</BaseButton>
	);
	// A host draws the reason, and a failure, on its own line. A blocked act's
	// reason stands before a failure; paused is the wait for a connection, not
	// a failure.
	if (host) return control;
	if (muted) {
		return (
			<div className={STACK}>
				{control}
				<Reason shown={said}>{blocked}</Reason>
			</div>
		);
	}
	const under = line ? acting.line : undefined;
	if (under === undefined) return control;
	return (
		<div className={STACK}>
			{control}
			<Reason shown failed={acting.holds || acting.pending === undefined}>
				{under}
			</Reason>
		</div>
	);
}
