import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type { IconName } from "@fcalell/ui-core/descriptors";
import { counted } from "@fcalell/ui-core/tokens";
import {
	type ButtonAct,
	type ButtonFit,
	button,
	buttonLabel,
} from "@fcalell/ui-core/variants";
import { use, useId } from "react";
import type { Closed } from "../../lib/closed.ts";
import { ActInert, endSubmit, SubmitContext } from "../../lib/form.ts";
import { ReasonHostContext, usePressed } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
import { Spinner } from "../spinner/index.tsx";
import { BOX, LABEL, PRESS } from "./link.tsx";
import { Reason } from "./reason.tsx";

const STACK = "flex flex-col items-start gap-pair";
const GLYPH = "shrink-0";
const PENDING = "opacity-0";
const LABEL_BLOCKED = "text-ink-disabled";
const SPINNER_LAYER = "absolute inset-0 flex items-center justify-center";

const FILL_PENDING: Record<ButtonAct, string> = {
	primary: "aria-busy:bg-act-accent-pending",
	danger: "aria-busy:bg-act-danger-pending",
	secondary: "",
	destructive: "",
	quiet: "",
};

const BLOCKED: Record<ButtonAct, string> = {
	primary: "aria-disabled:bg-fill-disabled aria-disabled:text-ink-disabled",
	danger: "aria-disabled:bg-fill-disabled aria-disabled:text-ink-disabled",
	secondary: "aria-disabled:text-ink-disabled",
	destructive: "aria-disabled:text-ink-disabled",
	quiet: "aria-disabled:text-ink-disabled",
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
	/** The act's kind: the accent fill (`primary`, the default), the danger fill, a hairline, the hairline in danger ink, or quiet words in the meta ink. */
	act?: ButtonAct;
	/** What it sits in: a body (the default), a bar, or full width under a field. */
	fit?: ButtonFit;
	/** A glyph before the label, in the label's ink. */
	icon?: IconName;
	/** The visible word, and the act's accessible name. */
	label: string;
	/** A number after the label, in a grey pill. */
	count?: number;
	/** A wait, in seconds left: the act is inert while it is above zero, its count drawn and its name carrying the seconds left, and it draws no reason, so its row never grows. At zero the count's slot stays, hidden, so the act keeps its width. */
	wait?: number;
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
	wait,
	onAct,
	loading,
	blocked,
}: ButtonProps) {
	const words = useWords();
	const kind = act ?? "primary";
	const reason = useId();
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
	const labelLook = loading ? PENDING : (muted || inert) && LABEL_BLOCKED;
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
			aria-label={
				waiting ? `${label}, ${counted(words.waitLeft, wait)}` : undefined
			}
			aria-disabled={loading || muted || inert || undefined}
			aria-busy={loading || undefined}
			aria-describedby={muted ? (host?.id ?? reason) : undefined}
			onClick={(event) => {
				endSubmit(submits, event);
				press();
			}}
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
			{wait !== undefined ? (
				<span
					aria-hidden
					className={cn(GLYPH, (loading || !waiting) && PENDING)}
				>
					<Count value={wait} />
				</span>
			) : count !== undefined ? (
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
	return (
		<div className={STACK}>
			{control}
			<Reason id={reason} shown={said}>
				{blocked}
			</Reason>
		</div>
	);
}
