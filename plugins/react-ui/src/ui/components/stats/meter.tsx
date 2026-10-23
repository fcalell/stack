import { Button as BaseButton } from "@base-ui/react/button";
import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { CountLink, MeterMark } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
import { levelOf } from "@fcalell/ui-core/list-state";
import { type PaintRole, paintText } from "@fcalell/ui-core/paint";
import {
	FIGURES,
	METER,
	METER_HEAD,
	METER_MARK,
	METER_TRACK,
	meterFill,
	TRAVEL_X,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import type { CSSProperties } from "react";
import type { Closed } from "../../lib/closed.ts";
import { PAINT_BOX, Painted } from "../../lib/paint.tsx";
import {
	endedSentence,
	FailedMark,
	RetryMark,
	useRow,
} from "../../lib/read.tsx";
import { Decoded } from "../../lib/slot.tsx";
import { useWords } from "../../lib/words.tsx";
import { CountLinks } from "./count-links.tsx";

const STACK = "flex flex-col min-w-0";
const ROOT = "relative";
const HEAD = "flex items-center";
const LABEL = "min-w-0 grow truncate";
const SHARE = "shrink-0";
// A failed meter's head is the retry: its after layer covers the meter, so
// pressing anywhere on it retries, and draws the ring inset at its edge.
const RETRY =
	"flex min-w-0 grow items-center text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring";
const END = "flex shrink-0 items-center";
// The bar is a container so the tick travels in the track's own widths (`cqw`), by transform; its box is no wider than a point, so a mark at the end adds no scroll.
const BAR = "relative @container";
const TRACK = "overflow-hidden";
const TICK = "absolute";
const TRAVEL = "absolute inset-y-0 left-0 w-0";

interface MeterBase extends Closed {
	/** What is measured (a short phrase; truncates). A selection paints, inert, until its read lands. */
	label: Datum<string>;
	/** How much is used; past `max` the meter is over. */
	value: Datum<number>;
	/** The limit. */
	max: Datum<number>;
	/** A tick across the track at the mark's value: the point the fill turns amber at, in place of the near share. */
	mark?: MeterMark;
}

/** The line under the bar: words, the counts as links, or both. */
interface MeterLine {
	/** A line under the bar: the value in words, when it resets (a sentence; wraps). */
	meta?: string;
	/** The line under the bar as links: counts that lead to their lists. */
	counts?: readonly CountLink[];
}

type MeterProps = MeterBase & MeterLine;

// The slot of a value an ended read left out: the loaded line's height and
// width held, nothing drawn, so the meter does not move.
function Blank({ role, at }: { role: PaintRole; at: number }) {
	return (
		<span aria-hidden className="invisible">
			{paintText(role, at)}
		</span>
	);
}

/** The meter form of a bound stat: the label at body 500 with the share in percent at its end, the bar under them filling by the share in the meta ink, amber once near full (at its `mark` when it has one) and `danger` once over, the line under the bar: the meta, or the counts as links. A `value` or `bound` that is a selection paints in its place, the meter inert, until its read lands; once its read ended the meter stands empty (no share, no fill) in the same box. The meter is the frame of the selections it draws: when one failed and no enclosing frame holds that read, the label stays, the share slot shows the failure mark and the retry icon, the line under the bar reads "This didn't load." and pressing the meter retries. Outside the package's exports. */
export function Meter({
	label,
	value,
	max,
	meta,
	counts,
	mark,
	at = 0,
}: MeterProps & { at?: number }) {
	const words = useWords();
	const [l, v, m] = useSelections([label, value, max]);
	const { ended: held, busy, retry } = useRow([label, value, max]);
	// A read that ended leaves the meter empty, unpainted: no share, no track
	// fill, the label standing if its own read answered. Held by the meter, its
	// failed form stands in the same box.
	const ended = [l, v, m].some(
		(one) => one.painted && (one.phase === "failed" || one.phase === "missing"),
	);
	const absent = l.painted || v.painted || m.painted;
	const painted = absent && !ended;
	// The drawn numbers are read only once absence is ruled out: a placeholder
	// is a function proxy.
	const used = absent ? 0 : (v.value as number);
	const limit = absent ? 0 : (m.value as number);
	const share = limit > 0 ? used / limit : 0;
	const markShare = mark && limit > 0 ? mark.value / limit : undefined;
	const percent = formatterFor("number", undefined, {
		style: "percent",
		maximumFractionDigits: 0,
	}).format(share);
	// A painted meter is no meter: its numbers are not here to be read, and
	// neither are an ended one's.
	const reads = absent
		? painted
			? { "aria-hidden": true }
			: {}
		: {
				role: "meter",
				"aria-label": l.value as string,
				"aria-valuemin": 0,
				"aria-valuemax": limit,
				"aria-valuenow": Math.min(used, limit),
			};
	const name = cn(text({ role: "body" }), textStrong({ role: "body" }), LABEL);
	const named = painted ? (
		<Painted role="name" at={at} />
	) : l.painted ? (
		<Blank role="name" at={at} />
	) : (
		(l.value as string)
	);
	// A failed meter's label is the retry; the rest are the label alone.
	const title =
		held === "failed" ? (
			<BaseButton
				onClick={() => {
					if (!busy) void retry();
				}}
				aria-label={`${words.retry} ${l.painted ? "" : (l.value as string)}`.trim()}
				className={cn(name, RETRY)}
			>
				{named}
			</BaseButton>
		) : (
			<span className={name}>{named}</span>
		);
	return (
		<div inert={painted || undefined} className={cn(METER, STACK, ROOT)}>
			{/* The role's children are presentational: the counts stand outside it, as links. */}
			<div {...reads} className={cn(METER, STACK)}>
				<div className={cn(METER_HEAD, HEAD)}>
					{title}
					{held ? (
						<span className={END}>
							<FailedMark />
							{held === "failed" ? <RetryMark busy={busy} /> : null}
						</span>
					) : (
						<span className={cn(text({ role: "meta" }), FIGURES, SHARE)}>
							{absent && !painted ? (
								<Blank role="figure" at={at} />
							) : (
								<Decoded
									role="figure"
									at={at}
									painted={painted}
									text={percent}
									of={share}
								/>
							)}
						</span>
					)}
				</div>
				<div className={BAR}>
					<div className={cn(METER_TRACK, TRACK, painted && PAINT_BOX)}>
						{absent ? null : (
							<div
								className={meterFill({ level: levelOf(share, markShare) })}
								// The fill is the whole track scaled to the data's share.
								style={{ "--fill": Math.min(share, 1) } as CSSProperties}
							/>
						)}
					</div>
					{markShare !== undefined ? (
						<div
							className={cn(TRAVEL_X, TRAVEL)}
							// The tick's place is the data's, the mark's share of the track.
							style={
								{
									"--travel": `${Math.min(Math.max(markShare, 0), 1) * 100}cqw`,
								} as CSSProperties
							}
						>
							<div className={cn(METER_MARK, TICK)} />
						</div>
					) : null}
				</div>
			</div>
			{held ? (
				<p className={text({ role: "meta" })}>{endedSentence(words, held)}</p>
			) : counts ? (
				<CountLinks counts={counts} painted={painted} />
			) : null}
			{!held && meta ? (
				<p className={text({ role: "meta" })}>
					{painted ? <Painted role="phrase" at={at} /> : meta}
				</p>
			) : null}
		</div>
	);
}
