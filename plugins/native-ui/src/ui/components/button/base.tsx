import {
	type ButtonAct,
	button,
	buttonContentTone,
	buttonLabel,
	type ContentTone,
	text,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { ActInert } from "../../lib/form";
import { Ink } from "../../lib/ink";
import { ReasonHostContext, usePressed } from "../../lib/reason";
import { useTouched } from "../../lib/touched";

import { CountBase } from "../count/base";
import { Icon } from "../icon";
import { Spinner } from "../spinner";
import type { ButtonProps } from "./index";

const STACK = "items-start gap-pair";
const BOX = "flex-row items-center justify-center";
const PENDING = "opacity-0";
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
// blocked, and neither takes the press.
function lookOf(kind: ButtonAct, loading: boolean, muted: boolean): string {
	if (loading) return FILL_PENDING[kind];
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
// act. Pending and blocked acts stay focusable and ignore the press; a pending
// act hides its glyph and label under the spinner and keeps its name, a
// blocked one says why under itself once pressed or once its form or sheet is
// touched, or on the line of the host that holds it. Its ink reaches the glyph
// and the spinner through `Ink`, since a native view takes no currentColor.
// Outside the package's exports.
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
	banner,
}: ButtonProps & { banner?: BannerInk }) {
	const kind = act ?? "primary";
	const muted = blocked !== undefined;
	const { touched } = useTouched();
	const host = useContext(ReasonHostContext);
	// Inert where it stands: the blocked look and no press, no reason.
	const waiting = wait !== undefined && wait > 0;
	const inert = (useContext(ActInert) || waiting) && !loading;
	const [pressed, keep] = usePressed(blocked);
	const said = muted && (pressed || touched);
	const look = lookOf(kind, loading === true, muted || inert);
	const labelLook = loading ? PENDING : (muted || inert) && LABEL_BLOCKED[kind];
	// A quiet act in a banner is in the banner's kind's ink.
	const toned = kind === "quiet" ? banner : undefined;
	const labelInk = toned?.label;
	const ink =
		(muted || inert) && !loading
			? INK_BLOCKED[kind]
			: (toned?.tone ?? buttonContentTone(kind));
	const press = () => {
		if (loading || inert) return;
		if (!muted) onAct?.();
		else if (host) host.press();
		else keep();
	};
	const control = (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{
				disabled: loading || muted || inert,
				busy: loading,
			}}
			onPress={press}
			className={cn(button({ act: kind, fit }), BOX, look)}
		>
			<Ink.Provider value={ink}>
				{icon ? (
					<View className={loading ? PENDING : undefined}>
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
					)}
				>
					{label}
				</RNText>
				{wait !== undefined ? (
					<View className={loading || !waiting ? PENDING : undefined}>
						<CountBase value={wait} inAct />
					</View>
				) : count !== undefined ? (
					<View className={loading ? PENDING : undefined}>
						<CountBase value={count} inAct />
					</View>
				) : null}
				{loading ? (
					<View className={SPINNER_LAYER}>
						<Spinner />
					</View>
				) : null}
			</Ink.Provider>
		</Pressable>
	);
	// A host draws the reason on its own line.
	if (!muted || host) return control;
	return (
		<View className={STACK}>
			{control}
			{said ? (
				<RNText className={text({ role: "meta" })}>{blocked}</RNText>
			) : null}
		</View>
	);
}
