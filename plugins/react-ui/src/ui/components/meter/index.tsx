import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { CountLink, MeterMark } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
import { levelOf } from "@fcalell/ui-core/list-state";
import { type PaintRole, painting, paintText } from "@fcalell/ui-core/paint";
import {
	FIGURES,
	METER,
	METER_HEAD,
	METER_MARK,
	METER_TRACK,
	meterFill,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { memo } from "react";
import type { Closed } from "../../lib/closed.ts";
import { PAINT_BOX, Painted } from "../../lib/paint.tsx";
import { sameBy } from "../../lib/same-by.ts";
import type { MeterSlots } from "../list/index.tsx";
import { CountLinks } from "./count-links.tsx";

const STACK = "flex flex-col min-w-0";
const HEAD = "flex items-center";
const LABEL = "min-w-0 grow truncate";
const SHARE = "shrink-0";
const BAR = "relative";
const TRACK = "overflow-hidden";
const TICK = "absolute";

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

/** The one line under the bar: words, or counts that are links, never both. */
type MeterLine =
	| {
			/** A line under the bar: the value in words, when it resets (a sentence; wraps). */
			meta?: string;
			counts?: never;
	  }
	| {
			/** The line under the bar as links: counts that lead to their lists. */
			counts: readonly CountLink[];
			meta?: never;
	  };

/** A share of a limit: how much of a quota is used. */
export type MeterProps = MeterBase & MeterLine;

/** What a `List` hands the meter it draws while its items are not here; no app sets it, so it is outside `MeterProps`. */
export interface MeterInternal {
	/** The meter is not here: the label, the share and the track paint, the line under the bar when it has one, and the meter is inert. */
	painted?: boolean;
	/** The meter's place among the painted ones, which varies the filler's lengths. */
	at?: number;
}

// The slot of a value an ended read left out: the loaded line's height and
// width held, nothing drawn, so the meter does not move.
function Blank({ role, at }: { role: PaintRole; at: number }) {
	return (
		<span aria-hidden className="invisible">
			{paintText(role, at)}
		</span>
	);
}

/** The label at body 500 with the share in percent at its end, the bar under them filling by the share in the meta ink, amber once near full (at its `mark` when it has one) and `danger` once over, the line under the bar: the meta, or the counts as links. A `label`, `value` or `max` that is a selection paints in its place, the meter inert, until its read lands; once its read ended the meter stands empty (no share, no fill, the label if its own read answered) in the same box. */
export function Meter(meter: MeterProps) {
	return <MeterBase {...meter} />;
}

/** Every meter: the public `Meter`, or the one a `List` paints. Outside the package's exports. */
export function MeterBase({
	label,
	value,
	max,
	meta,
	counts,
	mark,
	painted: listed = false,
	at = 0,
}: MeterProps & MeterInternal) {
	const [l, v, m] = useSelections([label, value, max]);
	// A read that ended leaves the meter empty, unpainted: no share, no track
	// fill, the label standing if its own read answered.
	const ended = [l, v, m].some(
		(one) => one.painted && (one.phase === "failed" || one.phase === "missing"),
	);
	const absent = listed || l.painted || v.painted || m.painted;
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
	return (
		<div inert={painted || undefined} className={cn(METER, STACK)}>
			{/* The role's children are presentational: the counts stand outside it, as links. */}
			<div {...reads} className={cn(METER, STACK)}>
				<div className={cn(METER_HEAD, HEAD)}>
					<span
						className={cn(
							text({ role: "body" }),
							textStrong({ role: "body" }),
							LABEL,
						)}
					>
						{painted ? (
							<Painted role="name" at={at} />
						) : l.painted ? (
							<Blank role="name" at={at} />
						) : (
							(l.value as string)
						)}
					</span>
					<span className={cn(text({ role: "meta" }), FIGURES, SHARE)}>
						{painted ? (
							<Painted role="figure" at={at} />
						) : absent ? (
							<Blank role="figure" at={at} />
						) : (
							percent
						)}
					</span>
				</div>
				<div className={BAR}>
					<div className={cn(METER_TRACK, TRACK, painted && PAINT_BOX)}>
						{share > 0 ? (
							<div
								className={meterFill({ level: levelOf(share, markShare) })}
								// The fill's width is the data's, the value's share of the max.
								style={{ width: `${Math.min(share, 1) * 100}%` }}
							/>
						) : null}
					</div>
					{markShare !== undefined ? (
						<div
							className={cn(METER_MARK, TICK)}
							// The tick's place is the data's, the mark's share of the max.
							style={{ left: `${Math.min(Math.max(markShare, 0), 1) * 100}%` }}
						/>
					) : null}
				</div>
			</div>
			{counts ? <CountLinks counts={counts} painted={painted} /> : null}
			{meta ? (
				<p className={text({ role: "meta" })}>
					{painted ? <Painted role="phrase" at={at} /> : meta}
				</p>
			) : null}
		</div>
	);
}

/** One meter of a `List` from its item: it runs the slots itself, so a refetch that changes one item renders that meter alone. */
function MeterItemBase<T>(props: {
	item: T;
	/** A painted row's place, which varies its fillers; a loaded row takes none. */
	index?: number;
	meter: MeterSlots<T>;
	painted: boolean;
}) {
	const { item, index, meter, painted } = props;
	const slot = <R,>(fn: (one: T) => R): R =>
		painted ? (painting(fn, item) as R) : fn(item);
	return (
		<MeterBase
			label={slot(meter.label)}
			value={slot(meter.value)}
			max={slot(meter.max)}
			mark={meter.mark && slot(meter.mark)}
			{...(meter.counts
				? { counts: slot(meter.counts) }
				: { meta: meter.meta && slot(meter.meta) })}
			painted={painted}
			at={index}
		/>
	);
}

export const MeterItem = memo(
	MeterItemBase,
	sameBy("item"),
) as typeof MeterItemBase;
