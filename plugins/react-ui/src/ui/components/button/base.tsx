import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import { type ButtonAct, button, buttonLabel } from "@fcalell/ui-core/variants";
import { use } from "react";
import { ActInert, endSubmit, SubmitContext } from "../../lib/form.ts";
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
const SPINNER_LAYER = "absolute inset-0 flex items-center justify-center";

const FILL_PENDING: Record<ButtonAct, string> = {
	primary: "aria-busy:bg-act-accent-pending",
	danger: "aria-busy:bg-act-danger-pending",
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
// over blocked, and neither takes the press.
function lookOf(kind: ButtonAct, loading: boolean, muted: boolean): string {
	if (loading) return FILL_PENDING[kind];
	if (muted) return BLOCKED[kind];
	return PRESS[kind];
}

/** The act every Button renders. `ink` is the text class a quiet act draws in (a Banner's kind's ink, as its glyph does). Outside the package's exports: a molecule that draws an act hands it its ink. */
export function ButtonBase({
	act,
	fit,
	icon,
	label,
	count,
	wait,
	onAct,
	loading,
	blocked,
	ink,
}: ButtonProps & { ink?: string }) {
	const kind = act ?? "primary";
	const muted = blocked !== undefined;
	const { touched } = useTouched();
	const host = use(ReasonHostContext);
	const submits = use(SubmitContext);
	// Inert beside a pending act: the blocked look and no press, no reason.
	const waiting = wait !== undefined && wait > 0;
	const inert = (use(ActInert) || waiting) && !loading;
	const [pressed, keep] = usePressed(blocked);
	const said = muted && (pressed || touched);
	const look = lookOf(kind, loading === true, muted || inert);
	const labelLook = loading ? PENDING : (muted || inert) && LABEL_BLOCKED[kind];
	const quietInk = kind === "quiet" && ink;
	const press = () => {
		if (inert) return;
		if (!muted) onAct?.();
		else if (host) host.press();
		else keep();
	};
	// Blocked is not Base UI's `disabled`, which swallows the press that shows
	// the reason: aria-disabled is set by hand, and the caller's props win the merge.
	const control = (
		<BaseButton
			disabled={loading}
			focusableWhenDisabled
			type={submits ? "submit" : "button"}
			aria-disabled={loading || muted || inert || undefined}
			aria-busy={loading || undefined}
			onClick={(event) => {
				endSubmit(submits, event);
				press();
			}}
			className={cn(button({ act: kind, fit }), BOX, quietInk, look)}
		>
			{icon ? (
				<span className={cn(GLYPH, loading && PENDING)}>
					<Icon name={icon} fit="control" />
				</span>
			) : null}
			<span
				className={cn(buttonLabel({ act: kind }), LABEL, quietInk, labelLook)}
			>
				{label}
			</span>
			{wait !== undefined ? (
				<span className={cn(GLYPH, (loading || !waiting) && PENDING)}>
					<CountBase value={wait} inAct />
				</span>
			) : count !== undefined ? (
				<span className={cn(GLYPH, loading && PENDING)}>
					<CountBase value={count} inAct />
				</span>
			) : null}
			{loading ? (
				<span className={SPINNER_LAYER}>
					<Spinner />
				</span>
			) : null}
		</BaseButton>
	);
	// A host draws the reason on its own line.
	if (!muted || host) return control;
	return (
		<div className={STACK}>
			{control}
			<Reason shown={said}>{blocked}</Reason>
		</div>
	);
}
