import { timings } from "@fcalell/ui-core/paint";
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
import { Text as RNText, View } from "react-native";
import { useAct } from "../../lib/act";
import { cn } from "../../lib/cn";
import { ActInert } from "../../lib/form";
import { Ink } from "../../lib/ink";
import { FadingText, lineIn } from "../../lib/motion";
import { inertProps, PAINT_CONTROL, useShown } from "../../lib/paint";
import { Press } from "../../lib/press";
import { ReasonHostContext, usePressed } from "../../lib/reason";
import { useTouched } from "../../lib/touched";

import { CountBase } from "../count/base";
import { Icon } from "../icon";
import { ActSheet } from "../sheet/act";
import { Spinner } from "../spinner";
import type { ButtonRunProps } from "./index";

const STACK = "items-start gap-gap";
const BOX = "flex-row items-center justify-center";
const PENDING = "opacity-0";
// Painted, the act keeps its loaded box and draws none of its content.
const HIDDEN = "opacity-0";
const SPINNER_LAYER = "absolute inset-0 items-center justify-center";

// The pressed look: an overlay that lands at once and fades out on release
// (`Press`), at the control's radius.
const WASH: Record<ButtonAct, string> = {
	primary: "rounded-control bg-act-accent-press",
	danger: "rounded-control bg-act-danger-press",
	secondary: "rounded-control bg-wash-press",
	destructive: "rounded-control bg-wash-press",
	quiet: "rounded-control bg-wash-press",
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
	return "";
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
	confirm,
	done,
	to,
	sheet,
	blocked,
	banner,
	painted,
	pending: given,
	line,
}: Omit<ButtonRunProps, "href" | "glyph"> & {
	banner?: BannerInk;
	painted?: boolean;
	pending?: boolean;
	line?: boolean;
}) {
	const kind = act ?? "primary";
	const muted = !painted && blocked !== undefined;
	const { touched } = useTouched();
	const host = useContext(ReasonHostContext);
	// A host with a line of its own draws a rejection there; the public Button
	// alone draws it under itself.
	const acting = useAct(line && !host ? "line" : "toast");
	const pending = given === true || acting.pending !== undefined;
	const drawn = useShown(pending, timings.actDelay);
	// Inert where it stands: the blocked look and no press, no reason.
	const waiting = wait !== undefined && wait > 0;
	const inert = (useContext(ActInert) || waiting) && !pending;
	const [pressed, keep] = usePressed(blocked);
	const said = muted && (pressed || touched);
	const look = painted
		? PAINT_CONTROL
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
			acting.run(true, {
				onAct: () => onAct?.(),
				label,
				destructive: kind === "destructive" || kind === "danger",
				confirm,
				done,
				to,
				sheet,
			});
		else onAct?.();
	};
	const face = (
		<Press
			painted={painted}
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{
				disabled: pending || muted || inert,
				busy: pending,
			}}
			onPress={press}
			{...inertProps(painted === true)}
			// A blocked, pending or painted act has no press to answer; a full-width
			// one gives no scale (a wide surface scaling reads as a wobble).
			wash={painted || pending || muted || inert ? undefined : WASH[kind]}
			give={fit !== "field" && !(painted || pending || muted || inert)}
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
		</Press>
	);
	const control = (
		<>
			{face}
			<ActSheet acting={acting} of={() => sheet} />
		</>
	);
	// A host draws the reason, and a failure, on its own line.
	if (host) return control;
	if (muted) {
		return (
			<View className={STACK}>
				{control}
				{said ? (
					<FadingText
						key={blocked}
						entering={lineIn()}
						className={text({ role: "meta" })}
					>
						{blocked}
					</FadingText>
				) : null}
			</View>
		);
	}
	if (!line) return control;
	// The stack stands from the first render, so the failure's line arriving
	// never remounts the act it was pressed on (and its focus with it).
	const under = acting.line;
	return (
		<View className={STACK}>
			{control}
			{under === undefined ? null : (
				<FadingText
					key={under}
					entering={lineIn()}
					accessibilityRole="alert"
					className={
						acting.holds || acting.pending === undefined
							? FIELD_ERROR_LINE
							: text({ role: "meta" })
					}
				>
					{under}
				</FadingText>
			)}
		</View>
	);
}
