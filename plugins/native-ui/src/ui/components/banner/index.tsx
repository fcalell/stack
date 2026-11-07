import {
	type Datum,
	useDrawsFailure,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { GLYPHS } from "@fcalell/ui-core/banner";
import { timeLeft } from "@fcalell/ui-core/clock";
import type { LinkAct, Run, Runs } from "@fcalell/ui-core/descriptors";
import { endedReason } from "@fcalell/ui-core/read";
import { partRuns } from "@fcalell/ui-core/runs";
import type { Tone } from "@fcalell/ui-core/tokens";
import {
	BANNER_MAIN,
	BANNER_ROW,
	banner,
	bannerContentTone,
	PENDING_LEFT,
	text,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import {
	type Act,
	asAct,
	type Offered,
	offered,
	wiringOf,
} from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { RunText } from "../../lib/code";
import { Ink } from "../../lib/ink";
import { blockIn, FadingView } from "../../lib/motion";
import { inertProps } from "../../lib/paint";
import { Strut } from "../../lib/strut";
import { useWords } from "../../lib/words";
import { ButtonBase } from "../button/base";
import { Icon, IconBase } from "../icon";
import { Spinner } from "../spinner";
import { Fill, usePending } from "./pending";

const BOX = "justify-center";
// With a deadline the strip holds the fill along its foot, clipped to its radius.
const PENDING = "relative overflow-hidden";
// The line over its act, as touch draws it.
const MAIN = "items-start gap-gap";
const LINE = "flex-row items-start self-stretch";
// The glyph beside a zero-width line of the sentence's role, so it stays on
// the first line of a wrapped sentence.
const GLYPH_BOX = "flex-row items-center shrink-0";
const SENTENCE = "min-w-0 flex-1";
// The act stands under the sentence, at the sentence's inset (the glyph and the
// line's gap in).
const ACT_SLOT = "flex-row shrink-0 items-center gap-gap ps-icon ms-gap";
// The time left beside the sentence, or before the act under it, outside the
// live region: a tick a second would be announced.
const TIME = "shrink-0";

export interface BannerProps extends Closed {
	// What it tells: news (`active`, the default), a caution (`attention`), or a
	// failure (`failed`). A selection paints the glyph, in the news tint, until
	// its read lands.
	tone?: Datum<Tone | undefined>;
	/** The text beside the glyph (a sentence; wraps): words, or runs, whose `{ code }` is drawn in the mono (a refused path). A selection draws no banner while its read waits, and nor does one that answers `undefined`, so a banner that stands only with its data is always placed and the page moves once, by its height, when it arrives (the shift floor reports that move). */
	sentence: Datum<Run | Runs | undefined>;
	// The one act it offers, under the line (a `{ label, href }` is a press that
	// navigates to its route); a blocked act's reason under it. A
	// selection paints the act's box until its read lands, and stands blocked
	// with the failed sentence once that read failed or is missing.
	act?: Offered<Act | LinkAct | undefined>;
	/** When the run the banner tells of ends (use with `tone="running"`): the banner draws the time left after the sentence (before the act, under the sentence, where it has one) and a line along its foot that fills toward it at a constant pace, and the clock stops at 0:00. Its `act` stands as the cancel. A moved `until` carries the fill on from where it stood. */
	until?: Date;
}

// A tinted strip at its content's height: the tone's glyph in the tone's ink
// beside the sentence in the body ink, and the act, an outlined Button at the
// bar fit, under the line. The tone and the act, given as
// selections, are painted in their places, and the banner takes no touch,
// until their reads land; the sentence's selection stands nothing until it
// lands.
export function Banner({ tone, sentence, act, until }: BannerProps) {
	const lifted = offered<Act | LinkAct | undefined>(act);
	const [picked, said, offer] = useSelections([tone, sentence, lifted]);
	useDrawsFailure([lifted]);
	const drawn = (picked.painted ? undefined : picked.value) ?? "active";
	const { end, run, now } = usePending(until);
	const words = useWords();
	// An act whose own read ended stands blocked with its sentence, never a
	// false yes; one still to land paints the banner inert.
	const ended = offer.painted ? endedReason(words, offer.phase) : undefined;
	const waits = picked.painted || (offer.painted && ended === undefined);
	const given = offer.painted || !offer.value ? undefined : asAct(offer.value);
	// The time left, beside the sentence; a run with an act stands it before
	// the act, under the sentence, the two one end as a PendingBar's.
	const acted = offer.painted || given !== undefined;
	const left =
		end === undefined ? null : (
			<RNText
				accessible={false}
				importantForAccessibility="no-hide-descendants"
				className={cn(PENDING_LEFT, TIME)}
			>
				{timeLeft(end, now)}
			</RNText>
		);
	// A block in the flow: it fades in on `base` as it mounts.
	// Whether there is anything to say is not known until the sentence's read
	// lands, so nothing stands while it waits (or ended): a banner painted then
	// and gone loaded would be a block that stood for nothing. The page moves
	// once, by its height, when the banner arrives with its data, which the
	// shift check reports.
	if (said.painted || said.value === undefined) return null;
	return (
		<FadingView
			entering={blockIn()}
			role={drawn === "failed" ? "alert" : "status"}
			{...inertProps(waits)}
			className={cn(banner({ tone: drawn }), BOX, end !== undefined && PENDING)}
		>
			{run === undefined ? null : <Fill run={run} now={now} />}
			<View className={cn(BANNER_MAIN, MAIN)}>
				<View className={cn(BANNER_ROW, LINE)}>
					<View className={GLYPH_BOX}>
						<Strut role="body" />
						{picked.painted ? (
							<IconBase name="Info" stroke="line" painted />
						) : (
							<Ink.Provider value={bannerContentTone(drawn)}>
								{drawn === "running" ? (
									// A run in progress turns where a status turns.
									<Spinner />
								) : (
									<Icon name={GLYPHS[drawn]} />
								)}
							</Ink.Provider>
						)}
					</View>
					<RNText className={cn(text({ role: "body" }), SENTENCE)}>
						{typeof said.value === "string" ? (
							said.value
						) : (
							<RunText runs={partRuns(said.value as Run | Runs)} whole />
						)}
					</RNText>
					{end === undefined || acted ? null : left}
				</View>
				{offer.painted ? (
					<View className={ACT_SLOT}>
						{left}
						{ended === undefined ? (
							<ButtonBase act="secondary" label="" painted />
						) : (
							<ButtonBase act="secondary" label={ended} blocked={ended} />
						)}
					</View>
				) : given ? (
					<View className={ACT_SLOT}>
						{left}
						<ButtonBase
							act="secondary"
							label={given.label}
							onAct={given.onAct}
							{...wiringOf(given)}
							blocked={given.blocked}
						/>
					</View>
				) : null}
			</View>
		</FadingView>
	);
}
