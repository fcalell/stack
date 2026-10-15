import {
	type Datum,
	useDrawsFailure,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { Act, IconName } from "@fcalell/ui-core/descriptors";
import {
	BANNER_MAIN,
	BANNER_ROW,
	type BannerKind,
	banner,
	bannerGlyph,
	text,
} from "@fcalell/ui-core/variants";
import { useMemo } from "react";
import type { Closed } from "../../lib/closed.ts";
import { Painted } from "../../lib/paint.tsx";
import { endedReason } from "../../lib/read.tsx";
import { ReasonHostContext, usePressed } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { ButtonBase } from "../button/base.tsx";
import { Reason } from "../button/reason.tsx";
import { Icon, IconBase } from "../icon/index.tsx";

const BOX = "flex flex-col justify-center";
// The line beside its act on the desktop, over it on touch.
const MAIN =
	"flex items-center touch:flex-col touch:items-start touch:gap-pair";
const LINE = "items-start flex grow shrink-10000000 min-w-0 touch:self-stretch";
// The glyph in a box of the sentence's line height, so it stays on the
// first line of a wrapped sentence.
const GLYPH_BOX = "flex shrink-0 items-center h-lh";
const SENTENCE = "min-w-0 grow";
// The act gives way only once the sentence has (its shrink weight is 10^7 against
// the act's 1), so a long label cuts and an ordinary one never narrows.
const ACT_SLOT = "flex min-w-0 max-w-full";

const GLYPHS: Record<BannerKind, IconName> = {
	note: "Info",
	warn: "TriangleAlert",
	danger: "CircleAlert",
};

/** A sentence about the state of the page, the app or a Section, in the flow. */
export interface BannerProps extends Closed {
	/** What it tells: news (`note`, the default), a caution (`warn`), or a failure (`danger`, announced at once). A selection paints the glyph, in the news tint, until its read lands. */
	kind?: Datum<BannerKind | undefined>;
	/** The text beside the glyph (a sentence; wraps). A selection paints the line until its read lands. */
	sentence: Datum<string>;
	/** The one act it offers, at the line's end; a blocked act's reason draws on the banner's own line, under it. A selection paints the act's box until its read lands, and stands blocked with the failed sentence once that read failed or is missing. */
	act?: Datum<Act | undefined>;
}

/** A tinted strip at its content's height, each prop that is a selection painted in its place, and the banner inert, until its read lands: the kind's glyph in the kind's ink beside the sentence in the body ink, and the act, a quiet Button at the bar fit in the kind's ink, beside the line on the desktop and under it on touch. */
export function Banner({ kind, sentence, act }: BannerProps) {
	const [tone, said, offer] = useSelections([kind, sentence, act]);
	useDrawsFailure([act]);
	const drawn = (tone.painted ? undefined : tone.value) ?? "note";
	const words = useWords();
	// An act whose own read ended stands blocked with its sentence, never a
	// false yes; one still to land paints the banner inert.
	const ended = offer.painted ? endedReason(words, offer.phase) : undefined;
	const waits =
		tone.painted || said.painted || (offer.painted && ended === undefined);
	const { touched } = useTouched();
	const given = offer.painted ? undefined : offer.value;
	const blocked = ended ?? given?.blocked;
	const [pressed, press] = usePressed(blocked);
	const host = useMemo(
		() => (blocked === undefined ? undefined : { press }),
		[blocked, press],
	);
	return (
		<div
			role={drawn === "danger" ? "alert" : "status"}
			inert={waits || undefined}
			className={cn(banner({ kind: drawn }), BOX)}
		>
			<div className={cn(BANNER_MAIN, MAIN)}>
				<div className={cn(BANNER_ROW, LINE)}>
					<span className={cn(GLYPH_BOX, bannerGlyph({ kind: drawn }))}>
						{tone.painted ? (
							<IconBase name="Info" stroke="line" painted />
						) : (
							<Icon name={GLYPHS[drawn]} />
						)}
					</span>
					<p className={cn(text({ role: "body" }), SENTENCE)}>
						{said.painted ? <Painted role="sentence" /> : said.value}
					</p>
				</div>
				{offer.painted ? (
					<span className={ACT_SLOT}>
						{ended === undefined ? (
							<ButtonBase act="quiet" fit="bar" label="" painted />
						) : (
							<ReasonHostContext value={host}>
								<ButtonBase
									act="quiet"
									fit="bar"
									ink={bannerGlyph({ kind: drawn })}
									label={ended}
									blocked={ended}
								/>
							</ReasonHostContext>
						)}
					</span>
				) : given ? (
					<span className={ACT_SLOT}>
						<ReasonHostContext value={host}>
							<ButtonBase
								act="quiet"
								fit="bar"
								ink={bannerGlyph({ kind: drawn })}
								label={given.label}
								onAct={given.onAct}
								failed={given.failed}
								blocked={blocked}
							/>
						</ReasonHostContext>
					</span>
				) : null}
			</div>
			{blocked === undefined ? null : (
				<Reason shown={pressed || touched} end="desktop">
					{blocked}
				</Reason>
			)}
		</div>
	);
}
