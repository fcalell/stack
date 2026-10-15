import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import type { Act, IconName } from "@fcalell/ui-core/descriptors";
import {
	BANNER_MAIN,
	BANNER_ROW,
	type BannerKind,
	banner,
	bannerContentTone,
	bannerGlyph,
	text,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { inertProps, Painted } from "../../lib/paint";
import { endedReason } from "../../lib/read";
import { Strut } from "../../lib/strut";
import { useWords } from "../../lib/words";
import { type BannerInk, ButtonBase } from "../button/base";
import { Icon, IconBase } from "../icon";

const BOX = "justify-center";
// The line over its act, as touch draws it.
const MAIN = "items-start gap-pair";
const LINE = "flex-row items-start self-stretch";
// The glyph beside a zero-width line of the sentence's role, so it stays on
// the first line of a wrapped sentence.
const GLYPH_BOX = "flex-row items-center shrink-0";
const SENTENCE = "min-w-0 flex-1";
const ACT_SLOT = "flex-row shrink-0";

const INKS: Record<BannerKind, BannerInk> = {
	note: inkOf("note"),
	warn: inkOf("warn"),
	danger: inkOf("danger"),
};

function inkOf(kind: BannerKind): BannerInk {
	return { label: bannerGlyph({ kind }), tone: bannerContentTone(kind) };
}

const GLYPHS: Record<BannerKind, IconName> = {
	note: "Info",
	warn: "TriangleAlert",
	danger: "CircleAlert",
};

export interface BannerProps extends Closed {
	// What it tells: news (`note`, the default), a caution (`warn`), or a
	// failure (`danger`). A selection paints the glyph, in the news tint, until
	// its read lands.
	kind?: Datum<BannerKind | undefined>;
	/** The text beside the glyph (a sentence; wraps). A selection paints the line until its read lands. */
	sentence: Datum<string>;
	// The one act it offers, under the line; a blocked act's reason under it. A
	// selection paints the act's box until its read lands, and stands blocked
	// with the failed sentence once that read failed or is missing.
	act?: Datum<Act | undefined>;
}

// A tinted strip at its content's height: the kind's glyph in the kind's ink
// beside the sentence in the body ink, and the act, a quiet Button at the
// bar fit in the kind's ink, under the line. Each prop that is a selection is
// painted in its place, and the banner takes no touch, until its read lands.
export function Banner({ kind, sentence, act }: BannerProps) {
	const [tone, said, offer] = useSelections([kind, sentence, act]);
	const drawn = (tone.painted ? undefined : tone.value) ?? "note";
	const words = useWords();
	// An act whose own read ended stands blocked with its sentence, never a
	// false yes; one still to land paints the banner inert.
	const ended = offer.painted ? endedReason(words, offer.phase) : undefined;
	const waits =
		tone.painted || said.painted || (offer.painted && ended === undefined);
	const given = offer.painted ? undefined : offer.value;
	return (
		<View
			role={drawn === "danger" ? "alert" : "status"}
			{...inertProps(waits)}
			className={cn(banner({ kind: drawn }), BOX)}
		>
			<View className={cn(BANNER_MAIN, MAIN)}>
				<View className={cn(BANNER_ROW, LINE)}>
					<View className={GLYPH_BOX}>
						<Strut role="body" />
						{tone.painted ? (
							<IconBase name="Info" stroke="line" painted />
						) : (
							<Ink.Provider value={bannerContentTone(drawn)}>
								<Icon name={GLYPHS[drawn]} />
							</Ink.Provider>
						)}
					</View>
					<RNText className={cn(text({ role: "body" }), SENTENCE)}>
						{said.painted ? <Painted role="sentence" /> : said.value}
					</RNText>
				</View>
				{offer.painted ? (
					<View className={ACT_SLOT}>
						{ended === undefined ? (
							<ButtonBase act="quiet" fit="bar" label="" painted />
						) : (
							<ButtonBase
								act="quiet"
								fit="bar"
								banner={INKS[drawn]}
								label={ended}
								blocked={ended}
							/>
						)}
					</View>
				) : given ? (
					<View className={ACT_SLOT}>
						<ButtonBase
							act="quiet"
							fit="bar"
							banner={INKS[drawn]}
							label={given.label}
							onAct={given.onAct}
							failed={given.failed}
							blocked={given.blocked}
						/>
					</View>
				) : null}
			</View>
		</View>
	);
}
