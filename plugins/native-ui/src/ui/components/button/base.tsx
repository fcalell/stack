import { ACT_DELAY } from "@fcalell/ui-core/paint";
import {
	type ButtonAct,
	button,
	buttonContentTone,
	buttonLabel,
	type ContentTone,
	FIELD_ERROR_LINE,
	text,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { useAct } from "../../lib/act";
import { cn } from "../../lib/cn";
import { ActInert } from "../../lib/form";
import { Ink } from "../../lib/ink";
import { inertProps, paintControl, useShown } from "../../lib/paint";
import { ReasonHostContext, usePressed } from "../../lib/reason";
import { useTouched } from "../../lib/touched";

import { CountBase } from "../count/base";
import { Icon } from "../icon";
import { Spinner } from "../spinner";
import type { ButtonProps } from "./index";

const STACK = "items-start gap-pair";
const BOX = "flex-row items-center justify-center";
const PENDING = "opacity-0";
// Painted, the act keeps its loaded box and draws none of its content.
const HIDDEN = "opacity-0";
const SPINNER_LAYER = "absolute inset-0 items-center justify-center";

const PRESS: Record<ButtonAct, string> = {
	primary: "active:bg-act-accent-press",
	danger: "active:bg-act-danger-press",
	secondary: "active:bg-wash-press",
	destructive: "active:bg-wash-press",
	quiet: "active:bg-wash-press",
};

const FILL_PENDING: Record<ButtonAct, string> = {
	primary: "bg-act-accent-pending",
	danger: "bg-act-danger-pending",
	secondary: "",
	destructive: "",
	quiet: "",
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
const INK_BLOCKED: Record<ButtonAct, "ink-meta" | "ink-disabled"> = {
	primary: "ink-meta",
	danger: "ink-meta",
	secondary: "ink-disabled",
	destructive: "ink-disabled",
	quiet: "ink-disabled",
};

// The blocked ink is the label's and the glyph's, through `Ink`: a view draws
// no text colour.
const BLOCKED: Record<ButtonAct, string> = {
	primary: "bg-fill-disabled",
	danger: "bg-fill-disabled",
	secondary: "",
	destructive: "",
	quiet: "",
};

// Pending and blocked are both inert, so one look is chosen: pending over
// blocked, and neither takes the press. A pending act keeps its rest look
// until the delay has run.
function lookOf(
	kind: ButtonAct,
	pending: boolean,
	shown: boolean,
	muted: boolean,
): string {
	if (pending) return shown ? FILL_PENDING[kind] : "";
	if (muted) return BLOCKED[kind];
	return PRESS[kind];
}

// The ink of a Banner's kind, which its quiet act draws in as the banner's
// glyph does: the text class and the glyph tone.
export interface BannerInk {
	label: string;
	tone: ContentTone;
}

// The act every Button renders; `banner` is the ink a Banner hands its quiet
// act. It holds its own run: inert at the press, then (after `ACT_DELAY`) its
// glyph and label hidden under the spinner, its name kept; a rejection is a
// failed toast with Retry. `pending` is a host's state handed down: the
// host holds the run, so a press calls the handler as it is; `line`
// draws a rejection under the act instead (the public Button standing alone).
// Pending and blocked acts stay focusable and ignore the press, a
// blocked one says why under itself once pressed or once its form or sheet is
// touched, or on the line of the host that holds it. Its ink reaches the glyph
// and the spinner through `Ink`, since a native view takes no currentColor.
// `painted` is the act while its data is not here: its box filled, its content
// not drawn, inert. Outside the package's exports.
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
	banner,
	painted,
	pending: given,
	line,
}: ButtonProps & {
	banner?: BannerInk;
	painted?: boolean;
	pending?: boolean;
	line?: boolean;
}) {
	const kind = act ?? "primary";
	const shown = useShown(painted);
	const muted = !painted && blocked !== undefined;
	const { touched } = useTouched();
	const host = useContext(ReasonHostContext);
	// A host with a line of its own draws a rejection there; the public Button
	// alone draws it under itself.
	const acting = useAct(line && !host ? "line" : "toast");
	const pending = given === true || acting.pending !== undefined;
	const drawn = useShown(pending, ACT_DELAY);
	// Inert where it stands: the blocked look and no press, no reason.
	const waiting = wait !== undefined && wait > 0;
	const inert = (useContext(ActInert) || waiting) && !pending;
	const [pressed, keep] = usePressed(blocked);
	const said = muted && (pressed || touched);
	const look = painted
		? paintControl(shown)
		: lookOf(kind, pending, drawn, muted || inert);
	const labelLook = drawn ? PENDING : (muted || inert) && LABEL_BLOCKED[kind];
	// A quiet act in a banner is in the banner's kind's ink.
	const toned = kind === "quiet" ? banner : undefined;
	const labelInk = toned?.label;
	const ink =
		(muted || inert) && !pending
			? INK_BLOCKED[kind]
			: (toned?.tone ?? buttonContentTone(kind));
	const press = () => {
		if (pending || inert) return;
		if (muted) {
			if (host) host.press();
			else keep();
		} else if (given === undefined)
			acting.run(true, { onAct: () => onAct?.(), failed });
		else onAct?.();
	};
	const control = (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{
				disabled: pending || muted || inert,
				busy: pending,
			}}
			onPress={press}
			{...inertProps(painted === true)}
			className={cn(button({ act: kind, fit }), BOX, look)}
		>
			<Ink.Provider value={ink}>
				{icon ? (
					<View className={cn(drawn && PENDING, painted && HIDDEN)}>
						<Icon name={icon} fit="control" />
					</View>
				) : null}
				<RNText
					numberOfLines={1}
					className={cn(
						buttonLabel({ act: kind }),
						"shrink",
						labelInk,
						labelLook,
						painted && HIDDEN,
					)}
				>
					{label}
				</RNText>
				{wait !== undefined ? (
					<View
						className={cn((drawn || !waiting) && PENDING, painted && HIDDEN)}
					>
						<CountBase value={wait} inAct />
					</View>
				) : count !== undefined ? (
					<View className={cn(drawn && PENDING, painted && HIDDEN)}>
						<CountBase value={count} inAct />
					</View>
				) : null}
				{drawn ? (
					<View className={SPINNER_LAYER}>
						<Spinner />
					</View>
				) : null}
			</Ink.Provider>
		</Pressable>
	);
	// A host draws the reason, and a failure, on its own line.
	if (host) return control;
	if (muted) {
		return (
			<View className={STACK}>
				{control}
				{said ? (
					<RNText className={text({ role: "meta" })}>{blocked}</RNText>
				) : null}
			</View>
		);
	}
	const under = line ? acting.line : undefined;
	if (under === undefined) return control;
	return (
		<View className={STACK}>
			{control}
			<RNText
				accessibilityRole="alert"
				className={
					acting.holds || acting.pending === undefined
						? FIELD_ERROR_LINE
						: text({ role: "meta" })
				}
			>
				{under}
			</RNText>
		</View>
	);
}
