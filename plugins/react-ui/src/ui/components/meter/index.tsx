import { cn } from "@fcalell/ui-core/cn";
import type { CountLink, MeterMark } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
import { filled, levelOf } from "@fcalell/ui-core/tokens";
import {
	FIGURES,
	METER,
	METER_COUNTS,
	METER_HEAD,
	METER_ITEM,
	METER_MARK,
	METER_TRACK,
	meterFill,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { GroundContext } from "../../lib/ground.ts";
import { useWords } from "../../lib/words.tsx";
import { Link } from "../link/index.tsx";
import { MeterWait } from "./wait.tsx";

const STACK = "flex flex-col min-w-0";
const HEAD = "flex items-center";
const LABEL = "min-w-0 grow truncate";
const SHARE = "shrink-0";
const BAR = "relative";
const TRACK = "overflow-hidden";
const TICK = "absolute";
const COUNTS = "flex flex-wrap";

interface MeterBase extends Closed {
	/** What is measured. */
	label: string;
	/** How much is used; past `max` the meter is over. */
	value: number;
	/** The limit. */
	max: number;
	/** What the value counts (`GB`, `requests`), read aloud with it. */
	unit?: string;
	/** A tick across the track at the mark's value, named to assistive tech: the point the fill turns `warn` at, in place of the near share. */
	mark?: MeterMark;
	/** The label, share, bar and the line under it as bars in their line boxes. */
	loading?: boolean;
}

/** The one line under the bar: words, or counts that are links, never both. */
type MeterLine =
	| {
			/** A line under the bar: the value in words, when it resets. */
			meta?: string;
			counts?: never;
	  }
	| {
			/** The line under the bar as links: counts that lead to their lists. */
			counts: CountLink[];
			meta?: never;
	  };

/** A share of a limit: how much of a quota is used. */
export type MeterProps = MeterBase & MeterLine;

/** The label at body 500 with the share in percent at its end, the bar under them filling by the share in the meta ink, `warn` once near full (at its `mark` when it has one) and `danger` once over, the line under the bar: the meta, or the counts as links. In a `Group` it stands as one of its items at the card's inset, the group's hairline between. */
export function Meter({
	label,
	value,
	max,
	unit,
	meta,
	counts,
	mark,
	loading,
}: MeterProps) {
	const words = useWords();
	// In a Group the meter is one of its items, at the card's inset.
	const item = use(GroundContext) === "group" && METER_ITEM;
	if (loading) return <MeterWait busy meta />;
	const share = max > 0 ? value / max : 0;
	const markShare = mark && max > 0 ? mark.value / max : undefined;
	const number = formatterFor("number");
	const percent = formatterFor("number", undefined, {
		style: "percent",
		maximumFractionDigits: 0,
	}).format(share);
	// A figure with its unit, when the meter counts one.
	const unitOf = (figure: string) => (unit ? `${figure} ${unit}` : figure);
	const amount = unitOf(
		filled(words.meterValue, {
			value: number.format(value),
			max: number.format(max),
		}),
	);
	const rest =
		share > 1
			? filled(words.meterOver, { amount: unitOf(number.format(value - max)) })
			: percent;
	const marked = mark
		? `, ${filled(words.meterMark, {
				name: mark.label,
				value: unitOf(number.format(mark.value)),
			})}`
		: "";
	return (
		<div className={cn(METER, item, STACK)}>
			{/* The role's children are presentational: the counts stand outside it, as links. */}
			{/* biome-ignore lint/a11y/useSemanticElements: a <meter> holds no children */}
			<div
				role="meter"
				aria-label={label}
				aria-valuemin={0}
				aria-valuemax={max}
				aria-valuenow={Math.min(value, max)}
				aria-valuetext={`${amount}, ${rest}${marked}`}
				className={cn(METER, STACK)}
			>
				<div className={cn(METER_HEAD, HEAD)}>
					<span
						className={cn(
							text({ role: "body" }),
							textStrong({ role: "body" }),
							LABEL,
						)}
					>
						{label}
					</span>
					<span className={cn(text({ role: "meta" }), FIGURES, SHARE)}>
						{percent}
					</span>
				</div>
				<div className={BAR}>
					<div className={cn(METER_TRACK, TRACK)}>
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
			{counts ? (
				<p className={cn(text({ role: "meta" }), METER_COUNTS, COUNTS)}>
					{counts.map((count) => (
						<Link key={`${count.href}${count.label}`} href={count.href}>
							<span className={FIGURES}>{number.format(count.value)}</span>{" "}
							{count.label}
						</Link>
					))}
				</p>
			) : null}
			{meta ? <p className={text({ role: "meta" })}>{meta}</p> : null}
		</div>
	);
}
