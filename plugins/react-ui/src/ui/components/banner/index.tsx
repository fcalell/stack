import {
	type Datum,
	paints,
	useDrawsFailure,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { GLYPHS } from "@fcalell/ui-core/banner";
import { timeLeft } from "@fcalell/ui-core/clock";
import { cn } from "@fcalell/ui-core/cn";
import type { LinkAct } from "@fcalell/ui-core/descriptors";
import { endedReason } from "@fcalell/ui-core/read";
import type { Tone } from "@fcalell/ui-core/tokens";
import {
	BANNER_MAIN,
	BANNER_ROW,
	BLOCK_IN,
	banner,
	bannerGlyph,
	PENDING_LEFT,
	text,
} from "@fcalell/ui-core/variants";
import { useMemo } from "react";
import type { Act } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { Painted } from "../../lib/paint.tsx";
import { ReasonHostContext, usePressed } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { ButtonBase } from "../button/base.tsx";
import { ActFace } from "../button/face.tsx";
import { Reason } from "../button/reason.tsx";
import { Icon, IconBase } from "../icon/index.tsx";
import { Spinner } from "../spinner/index.tsx";
import { Fill, usePending } from "./pending.tsx";

const BOX = "flex flex-col justify-center";
// With a deadline the strip holds the fill along its foot, clipped to its radius.
const PENDING = "relative overflow-hidden";
// The line beside its end group (the time left and the act) at every density
// while the sentence keeps its floor (two thirds of the banner's width, a
// fraction, never a width: the glyph and its gap come off it, so the column
// stays a readable measure and an end that would squeeze it takes its own
// line), the end under it only when it does not fit there. A run with a
// deadline and an act stands its end on the sentence's first line, the line
// holding the act's height with the air a one-line sentence has above and below
// it, so a wrapped sentence keeps the glyph, the time and the act on one line;
// on touch that end stands under the sentence, as a `PendingBar` stands its act.
const MAIN = "relative flex flex-wrap items-center";
const MAIN_RUN = "items-start touch:flex-col touch:items-stretch";
const LINE = "items-start flex grow shrink-10000000 basis-0 min-w-2/3";
const LINE_RUN = "py-[calc((var(--spacing-control)-1lh)/2)] touch:py-0";
// The glyph in a box of the sentence's line height, so it stays on the
// first line of a wrapped sentence.
const GLYPH_BOX = "flex shrink-0 items-center h-lh";
const TIME = "shrink-0";
const SENTENCE = "min-w-0 grow";
// The end gives way only once the sentence has (its shrink weight is 10^7
// against the end's 1), so a long label cuts and an ordinary one never narrows.
const END = "flex items-center gap-gap min-w-0 max-w-full";
const ACT_SLOT = "flex min-w-0 max-w-full";

/** A sentence about the state of the page, the app or a Section, in the flow. */
export interface BannerProps extends Closed {
	/** What it tells: news (`active`, the default), a caution (`attention`), or a failure (`failed`, announced at once). A selection paints the glyph, in the news tint, until its read lands. */
	tone?: Datum<Tone | undefined>;
	/** The text beside the glyph (a sentence; wraps). A selection paints the line until its read lands. */
	sentence: Datum<string>;
	/** The one act it offers, at the line's end (a `{ label, href }` is a link to a route, an anchor); a blocked act's reason draws on the banner's own line, under it. A selection paints the act's box until its read lands, and stands blocked with the failed sentence once that read failed or is missing. */
	act?: Datum<Act | LinkAct | undefined>;
	/** When the run the banner tells of ends (use with `tone="running"`): the banner draws the time left after the sentence, before the act as one end (on the sentence's first line, under the sentence on touch), and a line along its foot that fills toward it at a constant pace, and the clock stops at 0:00. Its `act` stands as the cancel. A moved `until` carries the fill on from where it stood. */
	until?: Date;
}

/** A block in the flow: it fades in on `base` as it mounts. With `until` it is a run in progress: a line fills along its foot toward the deadline and the time left stands after the sentence, beside the act as one end group on the sentence's first line, the two under the sentence on touch as a `PendingBar` stands them. A tinted strip at its content's height, each prop that is a selection painted in its place, and the banner inert, until its read lands: the tone's glyph in the tone's ink beside the sentence in the body ink, and the act, a quiet Button at the bar fit in the tone's ink, beside the sentence where the sentence keeps two thirds of the banner's width and under it where it would not. */
export function Banner({ tone, sentence, act, until }: BannerProps) {
	const [picked, said, offer] = useSelections([tone, sentence, act]);
	useDrawsFailure([act]);
	const drawn = (picked.painted ? undefined : picked.value) ?? "active";
	const { end, run, now } = usePending(until);
	const words = useWords();
	// An act whose own read ended stands blocked with its sentence, never a
	// false yes; one still to land paints the banner inert.
	const ended = offer.painted ? endedReason(words, offer.phase) : undefined;
	const waits =
		picked.painted || paints(said) || (offer.painted && ended === undefined);
	const { touched } = useTouched();
	const given = offer.painted ? undefined : offer.value;
	const blocked =
		ended ?? (given && "blocked" in given ? given.blocked : undefined);
	const [pressed, press] = usePressed(blocked);
	// A run with a deadline and an act: its end stands on the sentence's first
	// line, under the sentence on touch.
	const running = end !== undefined && (offer.painted || given !== undefined);
	const host = useMemo(
		() => (blocked === undefined ? undefined : { press }),
		[blocked, press],
	);
	return (
		<div
			role={drawn === "failed" ? "alert" : "status"}
			inert={waits || undefined}
			className={cn(
				banner({ tone: drawn }),
				BOX,
				BLOCK_IN,
				end !== undefined && PENDING,
			)}
		>
			{run === undefined ? null : (
				<Fill key={`${run.start}-${run.end}`} run={run} now={now} />
			)}
			<div className={cn(BANNER_MAIN, MAIN, running && MAIN_RUN)}>
				<div className={cn(BANNER_ROW, LINE, running && LINE_RUN)}>
					<span className={cn(GLYPH_BOX, bannerGlyph({ tone: drawn }))}>
						{picked.painted ? (
							<IconBase name="Info" stroke="line" painted />
						) : drawn === "running" ? (
							// A run in progress turns where a status turns.
							<Spinner />
						) : (
							<Icon name={GLYPHS[drawn]} />
						)}
					</span>
					<p className={cn(text({ role: "body" }), SENTENCE)}>
						{paints(said) ? (
							<Painted role="sentence" />
						) : said.painted ? null : (
							said.value
						)}
					</p>
				</div>
				{end === undefined && !offer.painted && !given ? null : (
					<div className={END}>
						{end === undefined ? null : (
							// Out of the live region: a tick a second would be announced.
							<span aria-hidden className={cn(TIME, PENDING_LEFT)}>
								{timeLeft(end, now)}
							</span>
						)}
						{offer.painted ? (
							<span className={ACT_SLOT}>
								{ended === undefined ? (
									<ButtonBase act="quiet" label="" painted />
								) : (
									<ReasonHostContext value={host}>
										<ButtonBase
											act="quiet"
											ink={bannerGlyph({ tone: drawn })}
											label={ended}
											blocked={ended}
										/>
									</ReasonHostContext>
								)}
							</span>
						) : given ? (
							<span className={ACT_SLOT}>
								<ReasonHostContext value={host}>
									<ActFace
										act={given}
										kind="quiet"
										ink={bannerGlyph({ tone: drawn })}
										blocked={blocked}
									/>
								</ReasonHostContext>
							</span>
						) : null}
					</div>
				)}
			</div>
			{blocked === undefined ? null : (
				<Reason shown={pressed || touched} end="desktop">
					{blocked}
				</Reason>
			)}
		</div>
	);
}
