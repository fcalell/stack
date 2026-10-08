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
import { ActInk, type ActInkValue } from "../../lib/act-ink";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { Strut } from "../../lib/strut";
import { Button } from "../button";
import { Icon } from "../icon";

const BOX = "justify-center";
// The line over its act, as touch draws it.
const MAIN = "items-start gap-pair";
const LINE = "flex-row items-start self-stretch";
// The glyph beside a zero-width line of the sentence's role, so it stays on
// the first line of a wrapped sentence.
const GLYPH_BOX = "flex-row items-center shrink-0";
const SENTENCE = "min-w-0 flex-1";
const ACT_SLOT = "flex-row shrink-0";

const INKS: Record<BannerKind, ActInkValue> = {
	note: inkOf("note"),
	warn: inkOf("warn"),
	danger: inkOf("danger"),
};

function inkOf(kind: BannerKind): ActInkValue {
	return { label: bannerGlyph({ kind }), tone: bannerContentTone(kind) };
}

const GLYPHS: Record<BannerKind, IconName> = {
	note: "Info",
	warn: "TriangleAlert",
	danger: "CircleAlert",
};

export interface BannerProps extends Closed {
	// What it tells: news (`note`, the default), a caution (`warn`), or a
	// failure (`danger`).
	kind?: BannerKind;
	/** The text beside the glyph (a sentence; wraps). */
	sentence: string;
	// The one act it offers, under the line; a blocked act's reason under it.
	act?: Act;
}

// A tinted strip at its content's height: the kind's glyph in the kind's ink
// beside the sentence in the body ink, and the act, a quiet Button at the
// bar fit in the kind's ink, under the line.
export function Banner({ kind, sentence, act }: BannerProps) {
	const drawn = kind ?? "note";
	return (
		<View
			role={drawn === "danger" ? "alert" : "status"}
			className={cn(banner({ kind: drawn }), BOX)}
		>
			<View className={cn(BANNER_MAIN, MAIN)}>
				<View className={cn(BANNER_ROW, LINE)}>
					<View className={GLYPH_BOX}>
						<Strut role="body" />
						<Ink.Provider value={bannerContentTone(drawn)}>
							<Icon name={GLYPHS[drawn]} />
						</Ink.Provider>
					</View>
					<RNText className={cn(text({ role: "body" }), SENTENCE)}>
						{sentence}
					</RNText>
				</View>
				{act ? (
					<View className={ACT_SLOT}>
						<ActInk.Provider value={INKS[drawn]}>
							<Button
								act="quiet"
								fit="bar"
								label={act.label}
								onAct={act.onAct}
								loading={act.loading}
								blocked={act.blocked}
							/>
						</ActInk.Provider>
					</View>
				) : null}
			</View>
		</View>
	);
}
