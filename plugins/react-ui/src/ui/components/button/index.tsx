import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type { IconName } from "@fcalell/ui-core/descriptors";
import {
	type ButtonAct,
	type ButtonFit,
	button,
	buttonLabel,
	text,
} from "@fcalell/ui-core/variants";
import { use, useEffect, useId, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { SubmitContext } from "../../lib/form.ts";
import { ReasonHostContext } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
import { Spinner } from "../spinner/index.tsx";

const STACK = "flex flex-col items-start gap-pair";
const BOX = "relative inline-flex items-center justify-center";
const GLYPH = "shrink-0";
const LABEL = "truncate";
const PENDING = "opacity-0";
const LABEL_BLOCKED = "text-ink-disabled";
const SPINNER_LAYER = "absolute inset-0 flex items-center justify-center";

const PRESS: Record<ButtonAct, string> = {
	primary: "hover:bg-act-accent-hover active:bg-act-accent-press",
	danger: "hover:bg-act-danger-hover active:bg-act-danger-press",
	secondary: "hover:bg-wash-hover active:bg-wash-press",
	destructive: "hover:bg-wash-hover active:bg-wash-press",
};

const FILL_PENDING: Record<ButtonAct, string> = {
	primary: "aria-busy:bg-act-accent-pending",
	danger: "aria-busy:bg-act-danger-pending",
	secondary: "",
	destructive: "",
};

const BLOCKED: Record<ButtonAct, string> = {
	primary: "aria-disabled:bg-fill-disabled aria-disabled:text-ink-disabled",
	danger: "aria-disabled:bg-fill-disabled aria-disabled:text-ink-disabled",
	secondary: "aria-disabled:text-ink-disabled",
	destructive: "aria-disabled:text-ink-disabled",
};

// Pending and blocked both set aria-disabled, so one look is chosen: pending
// over blocked, and neither takes the press.
function lookOf(kind: ButtonAct, loading: boolean, muted: boolean): string {
	if (loading) return FILL_PENDING[kind];
	if (muted) return BLOCKED[kind];
	return PRESS[kind];
}

/** A labelled act. */
export interface ButtonProps extends Closed {
	/** The act's kind: the accent fill (`primary`, the default), the danger fill, a hairline, or the hairline in danger ink. */
	act?: ButtonAct;
	/** What it sits in: a body (the default), a bar, or full width under a field. */
	fit?: ButtonFit;
	/** A glyph before the label, in the label's ink. */
	icon?: IconName;
	/** The visible word, and the act's accessible name. */
	label: string;
	/** A number after the label, in a grey pill. */
	count?: number;
	/** Runs the act. */
	onAct?: () => void;
	/** The act is running: inert, its glyph and label hidden under a spinner, its name kept. */
	loading?: boolean;
	/** Why the act cannot run: it is inert, describes itself by this sentence, and shows it under itself once pressed or once its form or sheet is touched. */
	blocked?: string;
}

/** A labelled act; pending and blocked acts keep focus and ignore the press. */
export function Button({
	act,
	fit,
	icon,
	label,
	count,
	onAct,
	loading,
	blocked,
}: ButtonProps) {
	const kind = act ?? "primary";
	const reason = useId();
	const muted = blocked !== undefined;
	const { touched } = useTouched();
	const host = use(ReasonHostContext);
	const submits = use(SubmitContext);
	const [pressed, setPressed] = useState(false);
	useEffect(() => {
		if (!muted) setPressed(false);
	}, [muted]);
	const said = muted && (pressed || touched);
	const look = lookOf(kind, loading === true, muted);
	const labelLook = loading ? PENDING : muted && LABEL_BLOCKED;
	const press = () => {
		if (!muted) onAct?.();
		else if (host) host.press();
		else setPressed(true);
	};
	// Blocked is not Base UI's `disabled`, which swallows the press that shows
	// the reason: aria-disabled is set by hand, and the caller's props win the merge.
	const control = (
		<BaseButton
			disabled={loading}
			focusableWhenDisabled
			type={submits ? "submit" : "button"}
			aria-disabled={loading || muted || undefined}
			aria-busy={loading || undefined}
			aria-describedby={muted ? (host?.id ?? reason) : undefined}
			onClick={press}
			className={cn(button({ act: kind, fit }), BOX, look)}
		>
			{icon ? (
				<span className={cn(GLYPH, loading && PENDING)}>
					<Icon name={icon} fit="control" />
				</span>
			) : null}
			<span className={cn(buttonLabel({ act: kind }), LABEL, labelLook)}>
				{label}
			</span>
			{count !== undefined ? (
				<span className={cn(GLYPH, loading && PENDING)}>
					<Count value={count} />
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
	// A blocked act holds its reason from the start, hidden until shown, so the
	// press that shows it keeps the button mounted and focused.
	return (
		<div className={STACK}>
			{control}
			<p id={reason} hidden={!said} className={text({ role: "meta" })}>
				{blocked}
			</p>
		</div>
	);
}
