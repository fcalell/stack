import type { Act, IconName } from "@fcalell/ui-core/descriptors";
import {
	BANNER_MAIN,
	BANNER_ROW,
	type BannerKind,
	banner,
	bannerContentTone,
	text,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { useLive } from "../../lib/live";
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

const GLYPHS: Record<BannerKind, IconName> = {
	note: "Info",
	warn: "TriangleAlert",
	danger: "CircleAlert",
};

export interface BannerProps extends Closed {
	// What it tells: news (`note`, the default), a caution (`warn`), or a
	// failure (`danger`, announced at once).
	kind?: BannerKind;
	sentence: string;
	// The one act it offers, under the line; a blocked act's reason under it.
	act?: Act;
}

// A tinted strip at its content's height: the kind's glyph in the kind's ink
// beside the sentence in the body ink, and the act, a hairline Button at the
// bar fit, under the line.
export function Banner({ kind, sentence, act }: BannerProps) {
	const drawn = kind ?? "note";
	const live = useLive(sentence, {
		assertive: drawn === "danger",
		appears: true,
	});
	return (
		<View
			role={drawn === "danger" ? "alert" : "status"}
			{...live}
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
						<Button
							act="secondary"
							fit="bar"
							label={act.label}
							onAct={act.onAct}
							loading={act.loading}
							blocked={act.blocked}
						/>
					</View>
				) : null}
			</View>
		</View>
	);
}
